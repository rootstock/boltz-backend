# Initial Port to RSK

**Current status:** 
* Running setup in `regtest` mode. 
* 5/65 integration tests are failing. The failing tests are in 2 files
```
test/integration/wallet/ethereum/ContractHandler.spec.ts
test/integration/wallet/ethereum/ContractEventHandler.spec.ts
```

From RSKJ client log, 4 of the failures are *out of gas* exceptions. One is an explicit error from Boltz "*revert EtherSwap: swap exists already*".  

## Setup for Ubuntu (e.g. Boton)

Clone the repo and check out `rskInit`. Tested on ubuntu (20.04 LTS).
## Dependencies

Most of these should already be available on personal machines.

### Docker

```
sudo apt install -y docker docker-compose
```
optionally add user to docker group or add `sudo` to the docker commands in `package.json`

```
sudo usermod -aG docker $USER # exit shell and login again
```

### RSKJ docker node 
Boltz uses geth in a docker container. I use a docker image with RSKJ Iris 3.3.0. (pulled from `optimalbrew/rsk:iris330`). The rskj node logs are `/var/log/rsk/rsk.log`. The logback file is very verbose (using default from rskj repo), and should be modifed as needed. As noted below, integration tests assume min gasprice of 0 (the `node.conf` in the container uses min gasPrice of 1).

### Make and gcc
```
sudo apt-get install -y gcc g++ make rsync
```
### nvm and node

Use node 14.  Using 16 on Ubuntu 20.04LTS lead to some failures in integration tests (Lnd and BTCCore Wallets) related `zeromq` 

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

source ~/.bashrc

nvm --version
nvm install 14 # node 16 had zeromq failures for BTC and LND zmq wallet integration tests
```

## Install project and start in regtest mode

Move into project directory and install dependencies
```
cd boltz*

npm install
npm run compile
```

Switch out the Bltz-core hardhat config with a modified one (RSK network)

```
rm node_modules/boltz-core/hardhat.config.ts
cp ./hardhat.config.rskModified.ts node_modules/boltz-core/hardhat.config.ts
```

Then can start and stop regtest deployment as follows

```
npm run docker:start

<<<<<<< HEAD
<<<<<<< HEAD
npm run docker:rskj:fundAcc
=======
docker run docker:rskj:fundAcc #optional, send to specific account
=======
docker run docker:rskj:fundAcc #optional, send RBTC and token to specific account
>>>>>>> 39e414d (continue fixing failing integration tests)

>>>>>>> 368f423 (start fixing integration test failures)
#stop
npm run docker:stop
```

## Integration tests
Tests were failing for multiple reasons: 
* websocket provider not working for RSKJ 
* tests expecting default minimum `gasPrice = 0` (geth in dev mode)
* tests using eip-1559 type. 

Modify the `/usr/local/rskj/node.conf` in RSKJ to reset the minGasPrice = 0 (from 1). Then restart the container and redeploy contracts
```
docker exec -it rskj bash # edit node.conf 
```

Restart the rskj container for changes to take effect.

```
docker restart rskj # this will restart/reset the RSK node
```
and redploy the contracts
```
npm run docker:rskj:deploy
```
Then use `npm run tests:int` to run (and identify failing) integration tests

The config changes (e.g. for min gasPrice) are lost when the containers are removed (e.g. through `npm run docker:stop`).

An alternative is to modify the wallet scripts to explicitly pass `gasPrice` of at least 1.

## Deployment

I created a config file `rskBoltzConfig.toml` for running the backend. The settings are from `docs/regtest.md`. Note that deployment config will be different. For regtest environment, the 3 addresses of the 3 deployed contracts (`EtherSwap`, `ERC20Swap` and the `ERC20Token`) are added. These addresses are reproducible for a given private key + fresh deployment.
