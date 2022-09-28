import { BigNumber, ContractTransaction } from 'ethers';
import { EtherSwap } from 'boltz-core/typechain/EtherSwap';
import { ERC20Swap } from 'boltz-core/typechain/ERC20Swap';
import Logger from '../../Logger';
import { getHexString } from '../../Utils';
import { getGasPrices } from './EthereumUtils';
import ERC20WalletProvider from '../providers/ERC20WalletProvider';
import { ethereumPrepayMinerFeeGasLimit } from '../../consts/Consts';

class ContractHandler {
  private etherSwap!: EtherSwap;
  private erc20Swap!: ERC20Swap;

  constructor(
    private logger: Logger,
  ) {}

  public init = (etherSwap: EtherSwap, erc20Swap: ERC20Swap): void => {
    this.etherSwap = etherSwap;
    this.erc20Swap = erc20Swap;
  };

  public lockupEther = async (
    preimageHash: Buffer,
    amount: BigNumber,
    claimAddress: string,
    timeLock: number,
  ): Promise<ContractTransaction> => {
    this.logger.debug(`Locking ${amount} Ether with preimage hash: ${getHexString(preimageHash)} , claimAddress: ${claimAddress}, timelock: ${timeLock}`);
    
    //TODO : fix these gas issues
    let txParams = {
      value: amount,
      ...await getGasPrices(this.etherSwap.provider),
    };
    return this.etherSwap.lock(preimageHash, claimAddress, timeLock, {
      ...txParams
    });
  };

  public lockupEtherPrepayMinerfee = async (
    preimageHash: Buffer,
    amount: BigNumber,
    amountPrepay: BigNumber,
    claimAddress: string,
    timeLock: number,
  ): Promise<ContractTransaction> => {
    const transactionValue = amount.add(amountPrepay);

    const gasLimitEstimationWithoutPrepay = await this.etherSwap.estimateGas.lock(
      preimageHash,
      claimAddress,
      timeLock,
      {
        value: transactionValue,
      },
    );

    this.logger.debug(`Locking ${amount} and sending prepay ${amountPrepay} Ether with preimage hash: ${getHexString(preimageHash)}`);
    return this.etherSwap.lockPrepayMinerfee(
      preimageHash,
      claimAddress,
      timeLock,
      amountPrepay,
      {
        value: transactionValue,
        // TODO: integration test that tries to exploit the attack vector of using an insane amount of gas in the fallback function of the contract at the claim address
        gasLimit: gasLimitEstimationWithoutPrepay.add(ethereumPrepayMinerFeeGasLimit),
        ...await getGasPrices(this.etherSwap.provider),
      },
    );
  };

  public claimEther = async (
    preimage: Buffer,
    amount: BigNumber,
    refundAddress: string,
    timelock: number,
  ): Promise<ContractTransaction> => {
    this.logger.debug(`Claiming Ether with preimage: ${getHexString(preimage)}`);
    return this.etherSwap.claim(
      preimage,
      amount,
      refundAddress,
      timelock,
      {
        ...await getGasPrices(this.etherSwap.provider),
        gasLimit: BigNumber.from(100000), //added to handle OOG on RSKJ
      }
    );
  };
  
  // todo(shree) modify method `claimEther() to fit DOC minting case
  // This will not actually be used since the call will be sent from PoC server, not Boltz
  // gaslimit will have to be very high, 450K or more.
  public claimDocViaMint = async (
    preimage: Buffer,
    amount: BigNumber,
    refundAddress: string,
    timelock: number,
    btcToMint: BigNumber,
    docReceiverAddress: string,
    leftoverRbtcAddr: string,
  ): Promise<ContractTransaction> => {
    this.logger.debug(`Claiming Ether with preimage: ${getHexString(preimage)}`);
    return this.etherSwap.claimDoCViaMint(
      preimage,
      amount,
      refundAddress,
      timelock,
      btcToMint,
      docReceiverAddress,
      leftoverRbtcAddr,
      {
        ...await getGasPrices(this.etherSwap.provider),
        gasLimit: BigNumber.from(700000), //minting is very expensive (450K+, more with fee estimation)
      }
    );
  };


  public refundEther = async (
    preimageHash: Buffer,
    amount: BigNumber,
    claimAddress: string,
    timelock: number,
  ): Promise<ContractTransaction> => {
    this.logger.debug(`Refunding Ether with preimage hash: ${getHexString(preimageHash)}`);
    return this.etherSwap.refund(
      preimageHash,
      amount,
      claimAddress,
      timelock,
      {
        ...await getGasPrices(this.etherSwap.provider),
        gasLimit: BigNumber.from(100000),  //added to handle OOG on RSKJ
      }
    );
  };

  public lockupToken = async (
    token: ERC20WalletProvider,
    preimageHash: Buffer,
    amount: BigNumber,
    claimAddress: string,
    timeLock: number,
  ): Promise<ContractTransaction> => {
    this.logger.debug(`Locking ${amount} ${token.symbol} with preimage hash: ${getHexString(preimageHash)}`);
    return this.erc20Swap.lock(
      preimageHash,
      amount,
      token.getTokenAddress(),
      claimAddress,
      timeLock,
      {
        ...await getGasPrices(this.etherSwap.provider),
      }
    );
  };

  public lockupTokenPrepayMinerfee = async (
    token: ERC20WalletProvider,
    preimageHash: Buffer,
    amount: BigNumber,
    amountPrepay: BigNumber,
    claimAddress: string,
    timeLock: number,
  ): Promise<ContractTransaction> => {
    const gasLimitEstimationWithoutPrepay = await this.erc20Swap.estimateGas.lock(
      preimageHash,
      amount,
      token.getTokenAddress(),
      claimAddress,
      timeLock,
    );

    this.logger.debug(`Locking ${amount} ${token.symbol} and sending prepay ${amountPrepay} Ether with preimage hash: ${getHexString(preimageHash)}`);
    return this.erc20Swap.lockPrepayMinerfee(
      preimageHash,
      amount,
      token.getTokenAddress(),
      claimAddress,
      timeLock,
      {
        value: amountPrepay,
        gasLimit: gasLimitEstimationWithoutPrepay.add(ethereumPrepayMinerFeeGasLimit),
        ...await getGasPrices(this.etherSwap.provider),
      },
    );
  };

  public claimToken = async (
    token: ERC20WalletProvider,
    preimage: Buffer,
    amount: BigNumber,
    refundAddress: string,
    timeLock: number,
  ): Promise<ContractTransaction> => {
    this.logger.debug(`Claiming ${token.symbol} with preimage: ${getHexString(preimage)}`);
    return this.erc20Swap.claim(
      preimage,
      amount,
      token.getTokenAddress(),
      refundAddress,
      timeLock,
      {
        ...await getGasPrices(this.etherSwap.provider),
      },
    );
  };

  public refundToken = async (
    token: ERC20WalletProvider,
    preimageHash: Buffer,
    amount: BigNumber,
    claimAddress: string,
    timeLock: number,
  ): Promise<ContractTransaction> => {
    this.logger.debug(`Refunding ${token.symbol} with preimage hash: ${getHexString(preimageHash)}`);
    return this.erc20Swap.refund(
      preimageHash,
      amount,
      token.getTokenAddress(),
      claimAddress,
      timeLock,
      {
        ...await getGasPrices(this.etherSwap.provider),
      },
    );
  };
}

export default ContractHandler;
