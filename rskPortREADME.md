# Initial Port to RSK
Clone the repo and check out `rskInit`

## Dependencies
Docker, node (use latest), npm, make, g++.

For example, on ubuntu

```
sudo apt install -y docker docker-compose

#optional
sudo usermod -aG docker $USER #ONLY if you want to avoid `sudo docker`

sudo apt-get install -y gcc g++ make rsync

# nvm and node
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