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
  return {
    // TODO : please fix this, this could be the root of gas price issues
    //type: 2,
    //maxFeePerGas: feeData.maxFeePerGas!,
    //maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
    // todo (shree): reminder to Pato. What's this about? 
     gasPrice: feeData.gasPrice?.gt(1) ? feeData.gasPrice : BigNumber.from(2),//,
     gasLimit: "0x222E0",
  };
};
