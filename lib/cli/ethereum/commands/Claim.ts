import { Arguments } from 'yargs';
import { crypto } from 'bitcoinjs-lib';
import { ContractTransaction, BigNumber, ContractReceipt } from 'ethers';
import { getHexBuffer } from '../../../Utils';
import BuilderComponents from '../../BuilderComponents';
import { connectEthereum, getContracts } from '../EthereumUtils';
import { queryERC20SwapValues, queryEtherSwapValues } from '../../../wallet/ethereum/ContractUtils';

export const command = 'claim <preimage> [token]';

export const describe = 'claims Ether or a ERC20 token from the corresponding swap contract';

export const builder = {
  preimage: {
    describe: 'preimage with which the funds have been locked',
    type: 'string',
  },
  token: BuilderComponents.token,
};

export const handler = async (argv: Arguments<any>): Promise<ContractReceipt> => {

  const signer = connectEthereum(argv.provider);
  const { etherSwap, erc20Swap } = await getContracts(signer);

  const preimage = getHexBuffer(argv.preimage);

  let transaction: ContractTransaction;

  if (argv.token) {
    const erc20SwapValues = await queryERC20SwapValues(erc20Swap, crypto.sha256(preimage));
    transaction = await erc20Swap.claim(
      preimage,
      erc20SwapValues.amount,
      erc20SwapValues.tokenAddress,
      erc20SwapValues.refundAddress,
      erc20SwapValues.timelock,
    );
  } else {
    const etherSwapValues = await queryEtherSwapValues(etherSwap, crypto.sha256(preimage));
    transaction = await etherSwap.claim(
      preimage,
      etherSwapValues.amount,
      etherSwapValues.refundAddress,
      etherSwapValues.timelock,
      //TODO fix this workaround with proper gas estimation (there are more in the project, unify this behaviour)
      {
        gasLimit: BigNumber.from(100000),
        gasPrice: BigNumber.from(1)
      }
    );
    console.log(transaction)
  }

  const result : ContractReceipt = await transaction.wait(1);

  console.log(`Claimed ${argv.token ? 'ERC20 token' : 'Ether'} in: ${transaction.hash}`);
  return result;
};
