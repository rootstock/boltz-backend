import { BigNumber } from 'ethers';
import { OutputType } from 'boltz-core';

export const ReverseSwapOutputType = OutputType.Bech32;

// Decimals from WEI to 10 ** -8
// Decimal calculation btw WEIs and SATs.
export const etherDecimals = BigNumber.from(10).pow(BigNumber.from(10));

// Symbol of the etherlike chain
export const ETHER_SYMBOL = "rBTC";

// Decimals from GWEI to WEI
export const gweiDecimals = BigNumber.from(10).pow(BigNumber.from(9));

// This amount will be multiplied with the current gas price to determine
// how much Ether should be sent to the claim address as prepay miner fee
// todo(shree) this may need to be much higher for minting, if intended to cover claimViaMint()
//    Not much downside to doing this automatically, as ultimately its jut RBTC in receipients address.
//    * but this bit is irreversible, since it is not paid to the contract. Rather to an EOA
export const ethereumPrepayMinerFeeGasLimit = BigNumber.from(100000);

