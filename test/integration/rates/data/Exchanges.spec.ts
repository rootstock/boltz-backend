import { baseAsset, checkPrice, quoteAsset } from './Consts';
import Kraken from '../../../../lib/rates/data/exchanges/Kraken';
import Binance from '../../../../lib/rates/data/exchanges/Binance';
import Bitfinex from '../../../../lib/rates/data/exchanges/Bitfinex';
import Poloniex from '../../../../lib/rates/data/exchanges/Poloniex';
import CoinbasePro from '../../../../lib/rates/data/exchanges/CoinbasePro';
import MoneyOnChain from '../../../../lib/rates/data/exchanges/MoneyOnChain';

describe('Exchanges', () => {
  test('should get price from Binance', async () => {
    const binance = new Binance();
    const price = await binance.getPrice(baseAsset, quoteAsset);

    checkPrice(price);
  });

  test('should get price from Bitfinex', async () => {
    const bitfinex = new Bitfinex();
    const price = await bitfinex.getPrice(baseAsset, quoteAsset);

    checkPrice(price);
  });

  test('should get price from Coinbase Pro', async () => {
    const coinbase = new CoinbasePro();
    const price = await coinbase.getPrice(baseAsset, quoteAsset);

    checkPrice(price);
  });

  test('should get price from Kraken', async () => {
    const kraken = new Kraken();
    const price = await kraken.getPrice(baseAsset, quoteAsset);

    checkPrice(price);
  });

  test('should get price from Poloniex', async () => {
    const poloniex = new Poloniex();
    const price = await poloniex.getPrice(baseAsset, quoteAsset);

    checkPrice(price);
  });

  test('should get price from MoneyOnChain', async () => {
    const moneyOnChain = new MoneyOnChain();
    const price = await moneyOnChain.getPrice('BTC', 'DOC');
    
    expect(typeof price).toEqual('number');

    expect(price).toBeGreaterThan(0);

  });
});
