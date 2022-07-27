import RateCalculator from '../../../lib/rates/RateCalculator';
import DataAggregator from '../../../lib/rates/data/DataAggregator';
import Errors from '../../../lib/rates/Errors';
import { ETHER_SYMBOL } from '../../../lib/consts/Consts';

const ethBtcRate = 0.04269969;
const ltcBtcRate = 0.00432060;

const aggregator = {
  latestRates: new Map<string, number>([
    [
      'rBTC/BTC',
      ethBtcRate,
    ],
    [
      'LTC/BTC',
      ltcBtcRate,
    ],
  ]),
} as any as DataAggregator;

describe('RateCalculator', () => {
  const calculator = new RateCalculator(aggregator);

  test('should get rate if pair exists', () => {
    expect(calculator.calculateRate(ETHER_SYMBOL, 'BTC')).toEqual(ethBtcRate);
  });

  test('should get rate if the inverse pair exists', () => {
    expect(calculator.calculateRate('BTC', ETHER_SYMBOL)).toEqual(1 / ethBtcRate);
  });

  test('should route rate calculations via the BTC pairs', () => {
    expect(calculator.calculateRate(ETHER_SYMBOL, 'LTC')).toEqual(ethBtcRate / ltcBtcRate);
  });

  test('should throw when rate cannot be calculated', () => {
    const notFoundSymbol = 'NOT';

    expect(() => calculator.calculateRate(notFoundSymbol, ETHER_SYMBOL)).toThrow(
      Errors.COULD_NOT_FIND_RATE(`${notFoundSymbol}/rBTC`).message,
    );

    expect(() => calculator.calculateRate(ETHER_SYMBOL, notFoundSymbol)).toThrow(
      Errors.COULD_NOT_FIND_RATE(`rBTC/${notFoundSymbol}`).message,
    );
  });
});
