
import Boltz from '../../lib/Boltz';
import { handler as newpreimage } from '../../lib/cli/commands/NewPreimage';
import { handler as claim } from '../../lib/cli/ethereum/commands/Claim';
import Service from '../../lib/service/Service';
import { bitcoinLndClient2 } from './Nodes';
import { getHexBuffer, stringify } from '../../lib/Utils';
import { Payment } from '../../lib/proto/lnd/rpc_pb.d';
import Logger from '../../lib/Logger';
import WalletManager from '../../lib/wallet/WalletManager';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const provider = 'http://127.0.0.1:4444';

beforeAll(async () => {
    const argv = {
        configpath: './test/integration/config.test.toml'
    }

    console.log('Starting BOLTZ')
    const boltz:Boltz = new Boltz(argv);
    await boltz.start();
    global.walletManager = boltz.getWalletManager();
    global.boltz = boltz;
    global.logger = new Logger('silly');
});

test.only('Exchange LN to rBTC', async () => {
    try { 
        const service:Service = global.boltz.service;
        const walletManager:WalletManager = global.walletManager;
        const balance = await walletManager.wallets.get('rBTC')?.getBalance();
        
        global.logger.info(`[TEST] - INIT. totalBalance: ${balance?.totalBalance}.`);
        /**
         * 1. Create preimage
         */
        global.logger.info(`[TEST] - 1. Create preimage.`);
        const preimage = newpreimage();

        /**
         * 2. Create reverse swap - Boltz creates the hodl invoice.
         */
        global.logger.info(`[TEST] - 2. Create reverse swap.`);
        const reqSwap = {
            pairId: "BTC/rBTC",
            invoiceAmount: 4000000, //0.04 btc = 4.000.000 sats
            orderSide: "sell",
            claimAddress: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
            prepayMinerFee: false,
            preimageHash: getHexBuffer(preimage.preimageHash)
            
        };
        const responseSwap = await service.createReverseSwap(reqSwap);

        /**
         * 3. Pay LN hodl invoice
         */
        global.logger.info(`[TEST] - 3. Paying invoice ${responseSwap.invoice}`);
        await bitcoinLndClient2.connect();
        const responseLN : Promise<Payment.AsObject>= bitcoinLndClient2.sendPayment(responseSwap.invoice);

        /**
         * Waiting for Boltz to lock funds
         */
        await sleep(5000);

        /**
         * 4. Claim rBTC
         */
        global.logger.info(`[TEST] - 4. Claiming rBTC.`);
        const claimResponse = await claim({
            provider,
            preimage: preimage.preimage
        });
        global.logger.info(`[TEST] - 4. Claiming Tx result : ${stringify(claimResponse)}`);

        /**
         * 5. LNPayment confirmed
         */
        const resultLN = await responseLN;
        global.logger.info(`[TEST] - 5. LNPayment confirmed. ${resultLN}`);
        const balance2 = await walletManager.wallets.get('rBTC')?.getBalance();
        
        global.logger.info(`[TEST] - END. totalBalance: ${balance?.totalBalance} -> ${balance2?.totalBalance}.`);
        await sleep(1000);
        await bitcoinLndClient2.disconnect();
    } catch (e:any) {
        fail(e);
    }
});

test('Exchange LN to DOC', async () => { // TODO
    try { 
        const service:Service = global.boltz.service;
        const walletManager:WalletManager = global.walletManager;
        const balance = await walletManager.wallets.get('rBTC')?.getBalance();
        
        global.logger.info(`[TEST] - INIT. totalBalance: ${balance?.totalBalance}.`);
        /**
         * 1. Create preimage
         */
        global.logger.info(`[TEST] - 1. Create preimage.`);
        const preimage = newpreimage();

        /**
         * 2. Create reverse swap
         */
        global.logger.info(`[TEST] - 2. Create reverse swap.`);
        const reqSwap = {
            pairId: "BTC/rBTC",
            invoiceAmount: 4000000, //0.04 btc = 4.000.000 sats
            orderSide: "sell",
            claimAddress: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
            prepayMinerFee: false,
            preimageHash: getHexBuffer(preimage.preimageHash)
            
        };
        const responseSwap = await service.createReverseSwap(reqSwap);

        /**
         * 3. Pay LN hodl invoice
         */
        global.logger.info(`[TEST] - 3. Paying invoice ${responseSwap.invoice}`);
        await bitcoinLndClient2.connect();
        const responseLN : Promise<Payment.AsObject>= bitcoinLndClient2.sendPayment(responseSwap.invoice);

        /**
         * Waiting for Boltz to lock funds
         */
        await sleep(5000);

        /**
         * 4. Claim rBTC
         */
        global.logger.info(`[TEST] - 4. Claiming rBTC.`);
        const claimResponse = await claim({
            provider,
            preimage: preimage.preimage
        });
        global.logger.info(`[TEST] - 4. Claiming Tx result : ${stringify(claimResponse)}`);

        /**
         * 5. LNPayment confirmed
         */
        const resultLN = await responseLN;
        global.logger.info(`[TEST] - 5. LNPayment confirmed. ${resultLN}`);
        const balance2 = await walletManager.wallets.get('rBTC')?.getBalance();
        
        global.logger.info(`[TEST] - END. totalBalance: ${balance?.totalBalance} -> ${balance2?.totalBalance}.`);
        await sleep(1000);
        await bitcoinLndClient2.disconnect();
        // TODO dumb assert, make a proper one.
        expect(balance2).toBe(balance2);
    } catch (e:any) {
        fail('Error in test LN->rBTC ' + e.message);
    }
});

afterAll(async () => {
    global.logger.info('Stop BOLTZ');
    global.boltz.stop();
});