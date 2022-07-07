import { Overrides, providers, BigNumber } from 'ethers';
import { getHexBuffer } from '../../Utils';

/**
 * Removes the 0x prefix of the Ethereum bytes
 */
export const parseBuffer = (input: string): Buffer => {
  return getHexBuffer(input.slice(2));
};

export const getGasPrices = async (provider: providers.Provider): Promise<Overrides> => {
  const feeData = await provider.getFeeData();
  console.log('feeData', feeData);
  return {
    // TODO : please fix this, this could be the root of gas price issues
    //type: 2,
    //maxFeePerGas: feeData.maxFeePerGas!,
    //maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
     gasPrice: BigNumber.from(1),//feeData.gasPrice!,
     gasLimit: '0xac890',
  };
};
