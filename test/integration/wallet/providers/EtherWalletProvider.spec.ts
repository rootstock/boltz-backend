import { BigNumber } from 'ethers';
import Logger from '../../../../lib/Logger';
import { etherDecimals } from '../../../../lib/consts/Consts';
import { fundSignerWallet, getSigner } from '../EthereumTools';
import EtherWalletProvider from '../../../../lib/wallet/providers/EtherWalletProvider';

describe('EtherWalletProvider', () => {
  const { provider, signer, etherBase } = getSigner();
  const wallet = new EtherWalletProvider(Logger.disabledLogger, signer);


  test('should get address', async () => {
    expect(await wallet.getAddress()).toEqual(await signer.getAddress());
  });

  test('should get balance', async () => {
    await fundSignerWallet(signer, etherBase);
   // console.log('\n****\ncheck signer balance \n*****\n');
    const balance = (await signer.getBalance()).div(etherDecimals).toNumber();
   // console.log(`bal is: ${balance}`);

    expect(await wallet.getBalance()).toEqual({
      totalBalance: balance,
      confirmedBalance: balance,
      unconfirmedBalance: 0,
    });
  });


  test('should send to address', async () => {
    const amount = 1000000;
    const { transactionId } = await wallet.sendToAddress(await signer.getAddress(), amount);

    const transaction = await provider.getTransaction(transactionId);
    expect(transaction.value).toEqual(BigNumber.from(amount).mul(etherDecimals));
  });

  test('should sweep wallet', async () => {
    const balance = await signer.getBalance();

    const { transactionId } = await wallet.sweepWallet(await etherBase.getAddress());

    const transaction = await provider.getTransaction(transactionId);
    const receipt = await provider.getTransactionReceipt(transactionId);

    const sentInTransaction = transaction.value.add(receipt.gasUsed.mul(transaction.gasPrice!));

    expect(balance).toEqual(sentInTransaction);

    const signNewBal = await signer.getBalance(); //this should be 0 in non eip-1559 case
    
    if (receipt.effectiveGasPrice){ //this will be undefined for rskj (no eip-1559)
      const expectedDust = (transaction.gasPrice!.sub(receipt.effectiveGasPrice)).mul(receipt.gasUsed);
      expect((signNewBal).toString()).toEqual(expectedDust.toString());  
    } else {
      expect(signNewBal).toEqual(BigNumber.from(0)); // there shouldn't be any dust in rsk sweep (no 1559)
    };

  });

  /* no need to destroy http provider
  afterAll(async () => {
      await provider.destroy();
  });*/

});
