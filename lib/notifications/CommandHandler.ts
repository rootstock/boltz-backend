import { Op } from 'sequelize';
import Logger from '../Logger';
import Stats from '../data/Stats';
import Report from '../data/Report';
import { codeBlock } from './Markup';
import Swap from '../db/models/Swap';
import OtpManager from './OtpManager';
import Service from '../service/Service';
import DiscordClient from './DiscordClient';
import { NotificationConfig } from '../Config';
import { Balance } from '../proto/boltzrpc_pb';
import { SwapUpdateEvent } from '../consts/Enums';
import ReferralStats from '../data/ReferralStats';
import ReverseSwap from '../db/models/ReverseSwap';
import BackupScheduler from '../backup/BackupScheduler';
import ChannelCreation from '../db/models/ChannelCreation';
import { coinsToSatoshis, satoshisToCoins } from '../DenominationConverter';
import { getChainCurrency, stringify, splitPairId, formatError } from '../Utils';

enum Command {
  Help = 'help',

  // Commands that retrieve information
  GetFees = 'getfees',
  SwapInfo = 'swapinfo',
  GetStats = 'getstats',
  GetBalance = 'getbalance',
  LockedFunds = 'lockedfunds',
  PendingSwaps = 'pendingswaps',
  GetReferrals = 'getreferrals',

  // Commands that generate a value or trigger a function
  Backup = 'backup',
  Withdraw = 'withdraw',
  GetAddress = 'getaddress',
  ToggleReverseSwaps = 'togglereverse',
}

type Usage = {
  command: string;
  description: string;
};

type CommandInfo = {
  usage?: Usage[];
  description: string;
  executor: (args: string[]) => Promise<void>
};

class CommandHandler {
  private optManager: OtpManager;

  private commands: Map<string, CommandInfo>;

  constructor(
    private logger: Logger,
    config: NotificationConfig,
    private discord: DiscordClient,
    private service: Service,
    private backupScheduler: BackupScheduler,
  ) {
    this.commands = new Map<string, CommandInfo>([
      [Command.Help, {
        usage: [
          {
            command: 'help [command]',
            description: 'gets more information about a single command',
          },
        ],
        executor: this.help,
        description: 'gets a list of all available commands',
      }],

      [Command.GetFees, {
        executor: this.getFees,
        description: 'gets accumulated fees',
      }],
      [Command.SwapInfo, {
        usage: [
          {
            command: 'swapinfo <id>',
            description: 'gets all available information about the (reverse) swap with the id `<id>`',
          },
        ],
        executor: this.swapInfo,
        description: 'gets all available information about a (reverse) swap',
      }],
      [Command.GetStats, {
        executor: this.getStats,
        description: 'gets stats of all successful swaps',
      }],
      [Command.GetBalance, {
        executor: this.getBalance,
        description: 'gets the balance of the wallets and channels',
      }],
      [Command.LockedFunds, {
        executor: this.lockedFunds,
        description: 'gets funds locked up by Boltz',
      }],
      [Command.PendingSwaps, {
        executor: this.pendingSwaps,
        description: 'gets a list of pending (reverse) swaps',
      }],
      [Command.GetReferrals, {
        executor: this.getReferrals,
        description: 'gets stats for all referral IDs',
      }],

      [Command.Backup, {
        executor: this.backup,
        description: 'uploads a backup of the databases',
      }],
      [Command.Withdraw, {
        usage: [
          {
            command: 'withdraw <OTP token> <currency> <invoice>',
            description: 'withdraws lightning funds',
          },
          {
            command: 'withdraw <OTP token> <currency> <address> <amount in whole coins>',
            description: 'withdraws a specific amount of onchain coins',
          },
          {
            command: 'withdraw <OTP token> <currency> <address> all',
            description: 'withdraws all onchain coins',
          },
        ],
        executor: this.withdraw,
        description: 'withdraws coins from Boltz',
      }],
      [Command.GetAddress, {
        usage: [
          {
            command: 'getaddress <currency>',
            description: 'gets an address for the currency `<currency>`',
          },
        ],
        executor: this.getAddress,
        description: 'gets an address for a currency',
      }],
      [Command.ToggleReverseSwaps, {
        executor: this.toggleReverseSwaps,
        description: 'enables or disables reverse swaps',
      }],
    ]);

    this.optManager = new OtpManager(this.logger, config);

    this.discord.on('message', async (message: string) => {
      const args = message.split(' ');

      // Get the command and remove the first argument from the array which is the command itself
      const command = args.shift();

      if (command) {
        const commandInfo = this.commands.get(command.toLowerCase());

        if (commandInfo) {
          this.logger.debug(`Executing Discord command: ${command} ${args.join(', ')}`);
          await commandInfo.executor(args);
        }
      }
    });
  }

  /*
   * Command executors
   */

  private help = async (args: string[]) => {
    if (args.length === 0) {
      let message = 'Commands:\n';

      this.commands.forEach((info, command) => {
        message += `\n**${command}**: ${info.description}`;
      });

      await this.discord.sendMessage(message);
    } else {
      const command = args[0].toLowerCase();
      const info = this.commands.get(command);

      if (!info) {
        await this.discord.sendMessage(`Could not find command: ${command}`);
        return;
      }

      let message = `\`${command}\`: ${info.description}`;

      if (info.usage) {
        message += '\n\n**Usage:**\n';

        for (const usage of info.usage) {
          message += `\n\`${usage.command}\`: ${usage.description}`;
        }
      }

      await this.discord.sendMessage(message);
    }
  };

  private getFees = async () => {
    let message = 'Fees:\n';

    const { swaps, reverseSwaps } = await Report.getSuccessfulSwaps(
      this.service.swapManager.swapRepository,
      this.service.swapManager.reverseSwapRepository,
    );
    const fees = this.getFeeOfSwaps(swaps, reverseSwaps);

    fees.forEach((fee, symbol) => {
      message += `\n**${symbol}**: ${satoshisToCoins(fee)} ${symbol}`;
    });

    await this.discord.sendMessage(message);
  };

  private swapInfo = async (args: string[]) => {
    if (args.length === 0) {
      await this.sendCouldNotFindSwap('');
      return;
    }

    const id = args[0];

    const swap = await this.service.swapManager.swapRepository.getSwap({
      id,
    });

    if (swap) {
      const channelCreation = await this.service.swapManager.channelCreationRepository.getChannelCreation({
        swapId: id,
      });

      await this.sendSwapInfo(swap, false, channelCreation);
      return;
    } else {
      // Query for a reverse swap because there was no normal one found with the specified id
      const reverseSwap = await this.service.swapManager.reverseSwapRepository.getReverseSwap({
        id,
      });

      if (reverseSwap) {
        await this.sendSwapInfo(reverseSwap, true);
        return;
      }
    }

    await this.sendCouldNotFindSwap(id);
  };

  private getStats = async () => {
    const stats = await new Stats(this.service.swapManager.swapRepository, this.service.swapManager.reverseSwapRepository).generate();

    await this.discord.sendMessage(`${codeBlock}${stats}${codeBlock}`);
  };

  private getBalance = async () => {
    const balances = (await this.service.getBalance()).getBalancesMap();

    let message = 'Balances:';

    balances.forEach((balance: Balance, symbol: string) => {
      // tslint:disable-next-line:prefer-template
      message += `\n\n**${symbol}**\n` +
        `Wallet: ${satoshisToCoins(balance.getWalletBalance()!.getTotalBalance())} ${symbol}`;

      const lightningBalance = balance.getLightningBalance();

      if (lightningBalance) {
        // tslint:disable-next-line:prefer-template
        message += '\n\nLND:\n' +
          `  Local: ${satoshisToCoins(lightningBalance.getLocalBalance())} ${symbol}\n` +
          `  Remote: ${satoshisToCoins(lightningBalance.getRemoteBalance())} ${symbol}`;
      }
    });

    await this.discord.sendMessage(message);
  };

  private lockedFunds = async () => {
    const pendingReverseSwaps = await this.service.swapManager.reverseSwapRepository.getReverseSwaps({
      status: {
        [Op.or]: [
          SwapUpdateEvent.TransactionMempool,
          SwapUpdateEvent.TransactionConfirmed,
        ],
      },
    });

    const pendingReverseSwapsByChain = new Map<string, ReverseSwap[]>();

    for (const pending of pendingReverseSwaps) {
      const pair = splitPairId(pending.pair);
      const chainCurrency = getChainCurrency(pair.base, pair.quote, pending.orderSide, true);

      let chainArray = pendingReverseSwapsByChain.get(chainCurrency);

      if (chainArray === undefined) {
        chainArray = [];
      }

      chainArray.push(pending);
      pendingReverseSwapsByChain.set(chainCurrency, chainArray);
    }

    let message = '**Locked up funds:**\n';

    for (const [symbol, chainArray] of pendingReverseSwapsByChain) {
      message += `\n**${symbol}**`;

      let symbolTotal = 0;

      for (const pendingReverseSwap of chainArray) {
        symbolTotal += pendingReverseSwap.onchainAmount;
        message += `\n  - \`${pendingReverseSwap.id}\`: ${satoshisToCoins(pendingReverseSwap.onchainAmount)}`;
      }

      message += `\n\nTotal: ${satoshisToCoins(symbolTotal)}\n`;
    }

    await this.discord.sendMessage(message);
  };

  private pendingSwaps = async () => {
    const [pendingSwaps, pendingReverseSwaps] = await Promise.all([
      this.service.swapManager.swapRepository.getSwaps({
        status: {
          [Op.notIn]: [
            SwapUpdateEvent.SwapExpired,
            SwapUpdateEvent.InvoiceFailedToPay,
            SwapUpdateEvent.TransactionClaimed,
          ],
        },
      }),
      this.service.swapManager.reverseSwapRepository.getReverseSwaps({
        status: {
          [Op.notIn]: [
            SwapUpdateEvent.SwapExpired,
            SwapUpdateEvent.InvoiceSettled,
            SwapUpdateEvent.TransactionFailed,
            SwapUpdateEvent.TransactionRefunded,
          ],
        },
      }),
    ]);

    let message = '';

    const formatSwapIds = (isReverse: boolean) => {
      const swaps = isReverse ? pendingReverseSwaps : pendingSwaps;

      if (swaps.length > 0) {
        message += `\n${message.endsWith('\n') ? '' : '\n'}**Pending${isReverse ? ' reverse' : ''} Swaps:**\n\n`;

        for (const swap of swaps) {
          message += `- \`${swap.id}\`\n`;
        }
      }
    };

    formatSwapIds(false);
    formatSwapIds(true);

    await this.discord.sendMessage(message);
  };

  private getReferrals = async () => {
    const stats = await new ReferralStats(
      this.service.swapManager.swapRepository,
      this.service.swapManager.reverseSwapRepository,
    ).generate();

    await this.discord.sendMessage(`${codeBlock}${stats}${codeBlock}`);
  };

  private backup = async () => {
    try {
      await this.backupScheduler.uploadDatabase(new Date());

      await this.discord.sendMessage('Uploaded backup of Boltz database');
    } catch (error) {
      await this.discord.sendMessage(`Could not upload backup: ${error}`);
    }
  };

  private getAddress = async (args: string[]) => {
    const sendError = (error: any) => {
      return this.discord.sendMessage(`Could not get address: ${formatError(error)}`);
    };

    try {
      if (args.length === 0) {
        await sendError('no currency was specified');
        return;
      }

      const currency = args[0].toUpperCase();

      const response = await this.service.getAddress(currency);
      await this.discord.sendMessage(`\`${response}\``);
    } catch (error) {
      await sendError(error);
    }
  };

  private withdraw = async (args: string[]) => {
    if (args.length !== 3 && args.length !== 4) {
      await this.discord.sendMessage('Invalid number of arguments');
      return;
    }

    const validToken = this.optManager.verify(args[0]);

    if (!validToken) {
      await this.discord.sendMessage('Invalid OTP token');
      return;
    }

    const symbol = args[1].toUpperCase();

    // Three arguments mean that just the OTP token, the symbol and a lightning invoice was provided
    if (args.length === 3) {
      try {
        const response = await this.service.payInvoice(symbol, args[2]);

        await this.discord.sendMessage(`Paid lightning invoice\nPreimage: ${response.paymentPreimage}`);
      } catch (error) {
        await this.discord.sendMessage(`Could not pay lightning invoice: ${formatError(error)}`);
      }

    // Four arguments mean that the OTP token, the symbol, an address and the amount were provided
    } else if (args.length === 4) {
      try {
        const sendAll = args[3] === 'all';
        const amount = sendAll ? 0 : coinsToSatoshis(Number(args[3]));

        const response = await this.service.sendCoins({
          amount,
          symbol,
          sendAll,

          address: args[2],
        });

        await this.discord.sendMessage(`Sent transaction: ${response.transactionId}:${response.vout}`);
      } catch (error) {
        await this.discord.sendMessage(`Could not send coins: ${formatError(error)}`);
      }
    }
  };

  private toggleReverseSwaps = async () => {
    this.service.allowReverseSwaps = !this.service.allowReverseSwaps;

    const message = `${this.service.allowReverseSwaps ? 'Enabled' : 'Disabled'} Reverse Swaps`;

    this.logger.info(message);
    await this.discord.sendMessage(message);
  };

  /*
   * Helper functions
   */

  private getFeeOfSwaps = (swaps: Swap[], reverseSwaps: ReverseSwap[]) => {
    // A map between the symbols of the currencies and the fees collected on that chain
    const fees = new Map<string, number>();

    const getFeeFromSwapMap = (array: Swap[] | ReverseSwap[], isReverse: boolean) => {
      array.forEach((swap: Swap | ReverseSwap) => {
        const { base, quote } = splitPairId(swap.pair);
        const feeSymbol = getChainCurrency(base, quote, swap.orderSide, isReverse);

        const fee = fees.get(feeSymbol);

        if (fee) {
          fees.set(feeSymbol, fee + swap.fee!);
        } else {
          fees.set(feeSymbol, swap.fee!);
        }
      });
    };

    getFeeFromSwapMap(swaps, false);
    getFeeFromSwapMap(reverseSwaps, true);

    return fees;
  };

  private sendSwapInfo = async (swap: Swap | ReverseSwap, isReverse: boolean, channelCreation?: ChannelCreation | null) => {
    const hasChannelCreation = channelCreation !== null && channelCreation !== undefined;

    let name: string;

    if (hasChannelCreation) {
      name = 'Channel Creation';
    } else {
      if (isReverse) {
        name = 'Reverse Swap';
      } else {
        name = 'Swap';
      }
    }

    // tslint:disable-next-line: prefer-template
    await this.discord.sendMessage(`${name} \`${swap.id}\`:\n` +
        `${codeBlock}${stringify(swap)}${hasChannelCreation ? '\n' + stringify(channelCreation) : ''}${codeBlock}`);
  };

  private sendCouldNotFindSwap = async (id: string) => {
    await this.discord.sendMessage(`Could not find swap with id: ${id}`);
  };
}

export default CommandHandler;
