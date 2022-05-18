# Initial Port to RSK
Clone the repo and check out `rskInit`

## Dependencies
Docker, node (use latest), npm, make, g++.

For example, on ubuntu

```
sudo apt install -y docker docker-compose

### optional
sudo usermod -aG docker $USER #ONLY if you want to avoid `sudo docker`

**Note: this branch will not work on M1-Macs!** It uses a RSKJ docker container for ubuntu, not Apple Silicon.
See `docker:rskj` in `package.json` and replace with appropriate docker image, or remove those commands and use RSKJ
 node without a container in the usual manner.

## Make, etc
sudo apt-get install -y gcc g++ make rsync


## nvm and node
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

source ~/.bashrc

nvm --version
nvm install 16 #or latest lts
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

npm run docker:rskj:fundAcc

#stop
npm run docker:stop
```

## Integration tests
Tests were failing for multiple reasons: 
* websocket provider not working for RSKJ 
* tests expecting default min `gasPrice =0` (geth in dev mode)
* tests using eip-1559 type. 

To see faliing integration tests run `npm run tests:int`

Implemented initial set of fixes for a specific suite `EtherWalletProvider`

```
npm run test:int2
```
