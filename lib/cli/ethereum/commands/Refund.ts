import { Arguments } from 'yargs';
import { ContractTransaction, BigNumber } from 'ethers';
import { getHexBuffer } from '../../../Utils';
import BuilderComponents from '../../BuilderComponents';
import { connectEthereum, getContracts } from '../EthereumUtils';
import { queryERC20SwapValues, queryEtherSwapValues } from '../../../wallet/ethereum/ContractUtils';

export const command = 'refund <preimageHash> [token]';

export const describe = 'refunds Ether or a ERC20 token from the corresponding swap contract';

export const builder = {
  preimageHash: {
    describe: 'preimage hash with which the funds have been locked',
    type: 'string',
  },
  token: BuilderComponents.token,
};

export const handler = async (argv: Arguments<any>): Promise<void> => {
  const signer = connectEthereum(argv.provider);
  const { etherSwap, erc20Swap } = await getContracts(signer);

  const preimageHash = getHexBuffer(argv.preimageHash);

  let transaction: ContractTransaction;

  if (argv.token) {
    const erc20SwapValues = await queryERC20SwapValues(erc20Swap, preimageHash);
    transaction = await erc20Swap.refund(
      preimageHash,
      erc20SwapValues.amount,
      erc20SwapValues.tokenAddress,
      erc20SwapValues.claimAddress,
      erc20SwapValues.timelock,
      {
        gasPrice: BigNumber.from(10).pow(7).mul(6), //0.06 gwei
      },
    );
  } else {
    const etherSwapValues = await queryEtherSwapValues(etherSwap, preimageHash);
    transaction = await etherSwap.refund(
      preimageHash,
      etherSwapValues.amount,
      etherSwapValues.claimAddress,
      etherSwapValues.timelock,
      {
        gasPrice: BigNumber.from(10).pow(7).mul(6), //0.06 gwei
      },
    );
  }

  await transaction.wait(1);

  console.log(`Refunded ${argv.token ? 'ERC20 token' : 'Ether'} in: ${transaction.hash}`);
};
