import { randomBytes } from 'crypto';
import { crypto } from 'bitcoinjs-lib';
import { ERC20 } from 'boltz-core/typechain/ERC20';
import { EtherSwap } from 'boltz-core/typechain/EtherSwap';
import { ERC20Swap } from 'boltz-core/typechain/ERC20Swap';
import { BigNumber, ContractTransaction, Wallet } from 'ethers';
import Logger from '../../../../lib/Logger';
import { fundSignerWallet, getSigner } from '../EthereumTools';
import { getContracts } from '../../../../lib/cli/ethereum/EthereumUtils';
import ContractHandler from '../../../../lib/wallet/ethereum/ContractHandler';
import ERC20WalletProvider from '../../../../lib/wallet/providers/ERC20WalletProvider';

describe('ContractHandler', () => {
  const { signer, provider, etherBase } = getSigner();

  let etherSwap: EtherSwap;
  let erc20Swap: ERC20Swap;
  let tokenContract: ERC20;

  let erc20WalletProvider: ERC20WalletProvider;

  const contractHandler = new ContractHandler(Logger.disabledLogger);
  const contractHandlerEtherBase = new ContractHandler(Logger.disabledLogger);

  const amount = BigNumber.from(10).pow(17);
  const preimage = randomBytes(32);
  const preimageHash = crypto.sha256(preimage);

  let timelock: number;

  const waitForTransaction = async (transaction: ContractTransaction) => {
    return transaction.wait(1);
  };

  const hashEtherSwapValues = async (claimAddress: string) => {
    return etherSwap.hashValues(
      preimageHash,
      amount,
      claimAddress,
      await signer.getAddress(),
      timelock,
    );
  };

  const hashErc20SwapValues = async (claimAddress: string) => {
    return erc20Swap.hashValues(
      preimageHash,
      amount,
      tokenContract.address,
      claimAddress,
      await signer.getAddress(),
      timelock,
    );
  };


  const querySwap = async (contract: EtherSwap | ERC20Swap, hash: string) => {
    return await contract.swaps(hash);
  };

  const lockupEther = async () => {
    const transaction = await contractHandler.lockupEther(
      preimageHash,
      amount,
      await etherBase.getAddress(),
      timelock,
    );

    await waitForTransaction(transaction);
  };

  const lockupErc20 = async () => {
    const feeData = await provider.getFeeData();
    const approveTransaction = await tokenContract.approve(erc20Swap.address, amount, {
      //type: 2,
      //maxFeePerGas: feeData.maxFeePerGas!,
      //maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
      gasPrice: feeData.gasPrice!,
    });
    await waitForTransaction(approveTransaction);

    const transaction = await contractHandler.lockupToken(
      erc20WalletProvider,
      preimageHash,
      amount,
      await etherBase.getAddress(),
      timelock,
    );
    await waitForTransaction(transaction);
  };

  beforeAll(async () => {
    const contracts = await getContracts(signer);

    etherSwap = contracts.etherSwap;
    erc20Swap = contracts.erc20Swap;
    tokenContract = contracts.token;

    erc20WalletProvider = new ERC20WalletProvider(
      Logger.disabledLogger,
      signer,
      {
        decimals: 18,
        symbol: 'TRC',
        contract: tokenContract,
      },
    );

    contractHandler.init(etherSwap, erc20Swap);
    contractHandlerEtherBase.init(etherSwap.connect(etherBase), erc20Swap.connect(etherBase));

    timelock = await provider.getBlockNumber();

    await fundSignerWallet(signer, etherBase, tokenContract);
  });

  test('should lockup Ether', async () => {
    await lockupEther();

    expect(await querySwap(
      etherSwap,
      await hashEtherSwapValues(await etherBase.getAddress()),
    )).toEqual(true);
  });

  test('should lockup Ether with prepay miner fee', async () => {
    const randomWallet = Wallet.createRandom().connect(provider);

    expect(await randomWallet.getBalance()).toEqual(BigNumber.from(0));

    const amountPrepay = BigNumber.from(1);

    const transaction = await contractHandler.lockupEtherPrepayMinerfee(
      preimageHash,
      amount,
      amountPrepay,
      randomWallet.address,
      timelock,
    );
    await waitForTransaction(transaction);

    // Sanity check the gas limit
    expect(transaction.gasLimit.toNumber()).toBeLessThan(150000);

    // Check that the prepay amount was forwarded to the claim address
    expect(await randomWallet.getBalance()).toEqual(amountPrepay);

    // Make sure the funds were locked in the contract
    expect(await querySwap(
      etherSwap,
      await hashEtherSwapValues(randomWallet.address),
    )).toEqual(true);
  });

  test('should claim Ether', async () => {
    const transaction = await contractHandlerEtherBase.claimEther(
      preimage,
      amount,
      await signer.getAddress(),
      timelock
    );
    await waitForTransaction(transaction);

    expect(await querySwap(
      etherSwap,
      await hashEtherSwapValues(await etherBase.getAddress()),
    )).toEqual(false);
  });

  test('should refund Ether', async () => {
    // Lockup again and sanity check
    await lockupEther();

    expect(await querySwap(
      etherSwap,
      await hashEtherSwapValues(await etherBase.getAddress()),
    )).toEqual(true);

    const transactionHash = await contractHandler.refundEther(
      preimageHash,
      amount,
      await etherBase.getAddress(),
      timelock,
    );
    await waitForTransaction(transactionHash);

    expect(await querySwap(
      etherSwap,
      await hashEtherSwapValues(await etherBase.getAddress()),
    )).toEqual(false);
  });

  test('should lockup ERC20 tokens', async () => {
    await lockupErc20();

    expect(await querySwap(
      erc20Swap,
      await hashErc20SwapValues(await etherBase.getAddress()),
    )).toEqual(true);
  });

  test('should lockup ERC20 tokens with prepay miner fee', async () => {
    // For explanations check the "should lockup Ether with prepay miner fee" test
    const randomWallet = Wallet.createRandom().connect(provider);

    expect(await randomWallet.getBalance()).toEqual(BigNumber.from(0));

    const amountPrepay = BigNumber.from(1);

    const feeData = await provider.getFeeData();
    const approveTransaction = await tokenContract.approve(erc20Swap.address, amount, {
      //type: 2,
      //maxFeePerGas: feeData.maxFeePerGas!,
      //maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
      gasPrice: feeData.gasPrice!,
    });
    await waitForTransaction(approveTransaction);

    const transaction = await contractHandler.lockupTokenPrepayMinerfee(
      erc20WalletProvider,
      preimageHash,
      amount,
      amountPrepay,
      randomWallet.address,
      timelock,
    );
    await waitForTransaction(transaction);

    expect(transaction.gasLimit.toNumber()).toBeLessThan(200000);

    expect(await randomWallet.getBalance()).toEqual(amountPrepay);

    expect(await querySwap(
      erc20Swap,
      await hashErc20SwapValues(randomWallet.address),
    )).toEqual(true);
  });

  test('should claim ERC20 tokens', async () => {
    const transactionHash = await contractHandlerEtherBase.claimToken(
      erc20WalletProvider,
      preimage,
      amount,
      await signer.getAddress(),
      timelock,
    );
    await waitForTransaction(transactionHash);

    expect(await querySwap(
      erc20Swap,
      await hashErc20SwapValues(await etherBase.getAddress()),
    )).toEqual(false);
  });

  test('should refund ERC20 tokens', async () => {
    // Lockup again and sanity check
    await lockupErc20();

    expect(await querySwap(
      erc20Swap,
      await hashErc20SwapValues(await etherBase.getAddress()),
    )).toEqual(true);

    const transactionHash = await contractHandler.refundToken(
      erc20WalletProvider,
      preimageHash,
      amount,
      await etherBase.getAddress(),
      timelock,
    );
    await waitForTransaction(transactionHash);

    expect(await querySwap(
      erc20Swap,
      await hashErc20SwapValues(await etherBase.getAddress()),
    )).toEqual(false);
  });

  afterAll(async () => {
    //await provider.destroy();
  });
});

