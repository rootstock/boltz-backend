import { Transaction } from 'liquidjs-lib';
import Logger from '../../Logger';
import ChainClient from '../../chain/ChainClient';
import ElementsClient from '../../chain/ElementsClient';
import WalletProviderInterface, { SentTransaction, WalletBalance } from './WalletProviderInterface';

class ElementsWalletProvider implements WalletProviderInterface {
  public readonly assetLabel = 'bitcoin';

  public readonly symbol: string;

  constructor(public logger: Logger, public chainClient: ElementsClient) {
    this.symbol = chainClient.symbol;

    this.logger.info(`Initialized ${this.symbol} Elements wallet`);
  }

  public getBalance = async (): Promise<WalletBalance> => {
    const balances = await this.chainClient.getBalances();

    const confirmedBalance = balances.mine.trusted[this.assetLabel];
    const unconfirmedBalance = balances.mine.untrusted_pending[this.assetLabel];

    return {
      confirmedBalance,
      unconfirmedBalance,
      totalBalance: confirmedBalance + unconfirmedBalance,
    };
  };

  public getAddress = (): Promise<string> => {
    return this.chainClient.getNewAddress();
  };

  public sendToAddress = async (address: string, amount: number): Promise<SentTransaction> => {
    const transactionId = await this.chainClient.sendToAddress(address, amount);
    const transactionVerbose = await this.chainClient.getRawTransactionVerbose(transactionId);

    return {
      transactionId,
      transaction: Transaction.fromHex(transactionVerbose.hex),
      vout: transactionVerbose.vout.find((output) => output.scriptPubKey.addresses!.includes(address))?.n,
      fee: Math.ceil(transactionVerbose.vout.find((output) => output.scriptPubKey.type === 'fee')!.value * ChainClient.decimals),
    };
  };

  public sweepWallet = async (_address: string, _relativeFee?: number | undefined): Promise<SentTransaction> => {
    return {
      transactionId: '',
    };
  };
}

export default ElementsWalletProvider;
