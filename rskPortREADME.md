# Initial Port to RSK

**Current status:** 
* Running setup in `regtest` mode. 
* 5/65 integration tests are failing. The failing tests are in 2 files
```
test/integration/wallet/ethereum/ContractHandler.spec.ts
test/integration/wallet/ethereum/ContractEventHandler.spec.ts
```

## Setup

Clone the repo and check out `rskInit`

This is for ubuntu (20.04 LTS).
## Dependencies
Docker, node (use latest), npm, make, g++.

```
sudo apt install -y docker docker-compose
```
optionally add user to docker group or add `sudo` to the docker commands in `package.json`

```
sudo usermod -aG docker $USER # exit shell and login again
```


**Note: this branch will not work on M1-Macs!** It uses a RSKJ docker container for ubuntu, not Apple Silicon.
See `docker:rskj` in `package.json` and replace with appropriate docker image, or remove those commands and use RSKJ
 node without a container in the usual manner.

## Make, etc
```
sudo apt-get install -y gcc g++ make rsync
```
## nvm and node

Use node 14.  Using 16 on Ubuntu 20.04LTS lead to some failures in integration tests (Lnd and BTCCore Wallets) related `zeromq` 

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

source ~/.bashrc

nvm --version
nvm install 14 # node 16 had zeromq failures for BTC and LND zmq wallet integration tests
```

## Install and play in regtest mode

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

npm run docker:rskj:fundAcc #optional, send RBTC and token to specific account

#stop
npm run docker:stop
```

## Integration tests
Tests were failing for multiple reasons: 
* websocket provider not working for RSKJ 
* tests expecting default min `gasPrice =0` (geth in dev mode)
* tests using eip-1559 type. 

Use `npm run tests:int` to run (and identify failing) integration tests
