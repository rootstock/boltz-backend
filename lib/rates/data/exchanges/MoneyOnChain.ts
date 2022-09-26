import Exchange from '../Exchange';
import { providers, utils, BigNumber } from 'ethers';

class MoneyOnChain implements Exchange {
  private ethProvider: providers.JsonRpcProvider;

  constructor() {
    this.ethProvider = new providers.JsonRpcProvider('https://public-node.rsk.co')
  }

  public async getPrice(baseAsset: string, quoteAsset: string): Promise<number> {
    switch (baseAsset) {
      case 'BTC':
      case 'rBTC':
        if(quoteAsset == 'DOC' ) {

          let btcPrice = await this.ethProvider.call({
            to: "0xb9C42EFc8ec54490a37cA91c423F7285Fa01e257",
            data: '0x8300df49'
          });
          return parseInt(utils.formatEther(BigNumber.from(btcPrice)));
        }
        throw new Error('Not supported pair ' + baseAsset + '/' + quoteAsset);
      default:
        throw new Error('Not supported pair ' + baseAsset + '/' + quoteAsset);

    }
  }
}

export default MoneyOnChain;