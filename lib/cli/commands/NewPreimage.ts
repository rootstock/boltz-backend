import { randomBytes } from 'crypto';
import { crypto } from 'bitcoinjs-lib';
import { getHexString, stringify } from '../../Utils';

export const command = 'newpreimage';

export const describe = 'generates a new preimage and its hash';

export const builder = {};

type Result = {
  preimage:string;
  preimageHash:string;
}

export const handler = (): Result => {
  const preimage = randomBytes(32);

  const result = {
    preimage: getHexString(preimage),
    preimageHash: getHexString(crypto.sha256(preimage)),
  };

  console.log(stringify(result));

  return result;
};
