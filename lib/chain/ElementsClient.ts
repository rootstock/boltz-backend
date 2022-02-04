import ChainClient from './ChainClient';
import { CurrencyType } from '../consts/Enums';
import { LiquidBalances } from '../consts/LiquidTypes';
import Logger from '../Logger';
import { ChainConfig } from '../Config';

class ElementsClient extends ChainClient {
  constructor(
    logger: Logger,
    config: ChainConfig,
    readonly symbol: string,
  ) {
    super(logger, config, symbol);
    this.currencyType = CurrencyType.Liquid;
  }

  public getBalances = async () => {
    const res = await this.client.request<LiquidBalances>('getbalances');

    for (const balanceType of Object.values(res.mine)) {
      for (const [key, value] of Object.entries(balanceType)) {
        balanceType[key] = value * ChainClient.decimals;
      }
    }

    return res;
  };
}

export default ElementsClient;
