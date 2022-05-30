import { ERC20 } from 'boltz-core/typechain/ERC20';
import { BigNumber, providers, Signer, Wallet } from 'ethers';

export const getSigner = (): { provider: providers.JsonRpcProvider, signer: Signer, etherBase: Signer } => {
  const provider = new providers.JsonRpcProvider('http://127.0.0.1:4444');

  return {
    provider,
    signer: Wallet.createRandom().connect(provider),
    etherBase: provider.getSigner(0),
  };
};

export const fundSignerWallet = async (signer: Signer, etherBase: Signer, token?: ERC20): Promise<void> => {
  const signerAddress = await signer.getAddress();

  const etherFundingTransaction = await etherBase.sendTransaction({
    to: signerAddress,
    value: BigNumber.from(10).pow(18),
  });

  await etherFundingTransaction.wait(1);

  if (token) {
    const tokenFundingTransaction = await token.connect(etherBase).transfer(
      signerAddress,
      BigNumber.from(10).pow(18),
      //{gasPrice: BigNumber.from(1) }
    );

    await tokenFundingTransaction.wait(1);
  }
};

export const waitForTransactionHash = async (provider: providers.JsonRpcProvider,  transactionHash: string): Promise<void> => {
  const transaction = await provider.getTransaction(transactionHash);
  await transaction.wait(1);
};
