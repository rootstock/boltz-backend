import { randomBytes } from 'crypto';
import { crypto } from 'bitcoinjs-lib';
import { BigNumber, constants } from 'ethers';
import { ERC20 } from 'boltz-core/typechain/ERC20';
import { EtherSwap } from 'boltz-core/typechain/EtherSwap';
import { ERC20Swap } from 'boltz-core/typechain/ERC20Swap';
import Logger from '../../../../lib/Logger';
import { waitForFunctionToBeTrue } from '../../../Utils';
import { fundSignerWallet, getSigner } from '../EthereumTools';
import ContractEventHandler from '../../../../lib/wallet/ethereum/ContractEventHandler';
import { getContracts } from '../../../../lib/cli/ethereum/EthereumUtils';

describe('ContractEventHandler', () => {
  const { signer, provider, etherBase } = getSigner();

  let etherSwap: EtherSwap;
  let erc20Swap: ERC20Swap;
  let tokenContract: ERC20;

  const contractEventHandler = new ContractEventHandler(Logger.disabledLogger);

  let startingHeight: number;

  let eventsEmitted = 0;

  const preimage = randomBytes(32);
  const preimageHash = crypto.sha256(preimage);

  const etherSwapValues = {
    amount: BigNumber.from(1),
    claimAddress: '',
    timelock: 2,
  };

  const erc20SwapValues = {
    amount: BigNumber.from(1),
    tokenAddress: '',
    claimAddress: '',
    timelock: 3,
  };

  const etherSwapTransactionHashes = {
    lockup: '',
    claim: '',
    refund: '',
  };

  const erc20SwapTransactionHashes = {
    lockup: '',
    claim: '',
    refund: '',
  };

  const registerEtherSwapListeners = () => {
    contractEventHandler.once('eth.lockup', async (transactionHash, emittedEtherSwapValues) => {
      await waitForFunctionToBeTrue(() => {
        return etherSwapTransactionHashes.lockup !== '';
      });

      expect(transactionHash).toEqual(etherSwapTransactionHashes.lockup);
      expect(emittedEtherSwapValues).toEqual({
        preimageHash,
        amount: etherSwapValues.amount,
        timelock: etherSwapValues.timelock,
        refundAddress: await signer.getAddress(),
        claimAddress: etherSwapValues.claimAddress,
      });

      eventsEmitted += 1;
    });

    contractEventHandler.once('eth.claim', async (transactionHash, emittedPreimageHash, emittedPreimage) => {
      await waitForFunctionToBeTrue(() => {
        return etherSwapTransactionHashes.claim !== '';
      });

      expect(transactionHash).toEqual(etherSwapTransactionHashes.claim);
      expect(emittedPreimageHash).toEqual(preimageHash);
      expect(preimage).toEqual(emittedPreimage);

      eventsEmitted += 1;
    });

    contractEventHandler.once('eth.refund', async (transactionHash, emittedPreimageHash) => {
      await waitForFunctionToBeTrue(() => {
        return etherSwapTransactionHashes.refund !== '';
      });

      expect(transactionHash).toEqual(etherSwapTransactionHashes.refund);
      expect(emittedPreimageHash).toEqual(preimageHash);

      eventsEmitted += 1;
    });
  };

  const registerErc20SwapListeners = () => {
    contractEventHandler.once('erc20.lockup', async (transactionHash, emittedErc20SwapValues) => {
      await waitForFunctionToBeTrue(() => {
        return erc20SwapTransactionHashes.lockup !== '';
      });

      expect(transactionHash).toEqual(erc20SwapTransactionHashes.lockup);
      expect(emittedErc20SwapValues).toEqual({
        preimageHash,
        amount: erc20SwapValues.amount,
        timelock: erc20SwapValues.timelock,
        tokenAddress: tokenContract.address,
        refundAddress: await signer.getAddress(),
        claimAddress: erc20SwapValues.claimAddress,
      });

      eventsEmitted += 1;
    });

    contractEventHandler.once('erc20.claim', async (transactionHash, emittedPreimageHash, emittedPreimage) => {
      await waitForFunctionToBeTrue(() => {
        return erc20SwapTransactionHashes.claim !== '';
      });

      expect(transactionHash).toEqual(erc20SwapTransactionHashes.claim);
      expect(preimage).toEqual(emittedPreimage);
      expect(emittedPreimageHash).toEqual(preimageHash);

      eventsEmitted += 1;
    });

    contractEventHandler.once('erc20.refund', async (transactionHash, emittedPreimageHash) => {
      await waitForFunctionToBeTrue(() => {
        return erc20SwapTransactionHashes.refund !== '';
      });

      expect(transactionHash).toEqual(erc20SwapTransactionHashes.refund);
      expect(emittedPreimageHash).toEqual(preimageHash);

      eventsEmitted += 1;
    });
  };

  beforeAll(async () => {
    const contracts = await getContracts(signer);

    etherSwap = contracts.etherSwap;
    erc20Swap = contracts.erc20Swap;
    tokenContract = contracts.token;

    erc20SwapValues.tokenAddress = tokenContract.address;

    startingHeight = await provider.getBlockNumber() + 1;

    etherSwapValues.claimAddress = await etherBase.getAddress();
    erc20SwapValues.claimAddress = await etherBase.getAddress();

    await fundSignerWallet(signer, etherBase, tokenContract);
  });

  beforeEach(() => {
    eventsEmitted = 0;
  });

  test('should init', async () => {
    await contractEventHandler.init(
      etherSwap,
      erc20Swap,
    );
  });

  test('should subscribe to the Ethereum Swap contract events', async () => {
    registerEtherSwapListeners();

    // Lockup
    console.log('start lockup');
    let lockupTransaction = await etherSwap.lock(preimageHash, etherSwapValues.claimAddress, etherSwapValues.timelock, {
      value: etherSwapValues.amount,
    });
    etherSwapTransactionHashes.lockup = lockupTransaction.hash;

    await lockupTransaction.wait(1);
    console.log('check event emit'); 
    await waitForFunctionToBeTrue(() => {
      return eventsEmitted === 1;
    });

    // Claim
    console.log('start claim');
    const claimTransaction = await etherSwap.connect(etherBase).claim(
      preimage,
      etherSwapValues.amount,
      await signer.getAddress(),
      etherSwapValues.timelock,
    );
    etherSwapTransactionHashes.claim = claimTransaction.hash;

    await claimTransaction.wait(1);
    console.log('check claim emit');
    await waitForFunctionToBeTrue(() => {
      return eventsEmitted === 2;
    });

    // Refund
    console.log('start refund');
    lockupTransaction = await etherSwap.lock(preimageHash, etherSwapValues.claimAddress, etherSwapValues.timelock, {
      value: etherSwapValues.amount,
    });

    await lockupTransaction.wait(1);

    const refundTransaction = await etherSwap.refund(
      preimageHash,
      etherSwapValues.amount,
      etherSwapValues.claimAddress,
      etherSwapValues.timelock,
    );
    etherSwapTransactionHashes.refund = refundTransaction.hash;

    await refundTransaction.wait(1);
    console.log('wait refund emit');
    await waitForFunctionToBeTrue(() => {
      return eventsEmitted === 3;
    });
  });

  test('should subscribe to the ERC20 Swap contract events', async () => {
    registerErc20SwapListeners();

    await tokenContract.approve(erc20Swap.address, constants.MaxUint256);

    // Lockup
    let lockupTransaction = await erc20Swap.lock(
      preimageHash,
      erc20SwapValues.amount,
      erc20SwapValues.tokenAddress,
      erc20SwapValues.claimAddress,
      erc20SwapValues.timelock,
    );
    erc20SwapTransactionHashes.lockup = lockupTransaction.hash;

    await lockupTransaction.wait(1);

    await waitForFunctionToBeTrue(() => {
      return eventsEmitted === 1;
    });

    // Claim
    const claimTransaction = await erc20Swap.connect(etherBase).claim(
      preimage,
      erc20SwapValues.amount,
      erc20SwapValues.tokenAddress,
      await signer.getAddress(),
      erc20SwapValues.timelock,
    );
    erc20SwapTransactionHashes.claim = claimTransaction.hash;

    await claimTransaction.wait(1);

    await waitForFunctionToBeTrue(() => {
      return eventsEmitted === 2;
    });

    // Refund
    lockupTransaction = await erc20Swap.lock(
      preimageHash,
      erc20SwapValues.amount,
      erc20SwapValues.tokenAddress,
      erc20SwapValues.claimAddress,
      erc20SwapValues.timelock,
    );
    await lockupTransaction.wait(1);

    const refundTransaction = await erc20Swap.refund(
      preimageHash,
      erc20SwapValues.amount,
      erc20SwapValues.tokenAddress,
      erc20SwapValues.claimAddress,
      erc20SwapValues.timelock,
    );
    erc20SwapTransactionHashes.refund = refundTransaction.hash;

    await refundTransaction.wait(1);

    await waitForFunctionToBeTrue(() => {
      return eventsEmitted === 3;
    });

    await tokenContract.approve(erc20Swap.address, 0);
  });

  test('should rescan', async () => {
    registerEtherSwapListeners();
    registerErc20SwapListeners();

    await contractEventHandler.rescan(startingHeight);

    await waitForFunctionToBeTrue(() => {
      return eventsEmitted === 6;
    });
  });

  /*afterAll(async () => {
    contractEventHandler.removeAllListeners();

    await provider.destroy();
  });*/
});
