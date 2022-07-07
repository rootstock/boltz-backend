# Boltz fork - Port to RSK

**Current status:** 
* Running setup in `regtest` mode. 
* Several TODO issues to work on.

## Setup for Ubuntu

Tested on Ubuntu 18.04 and 20.04

Clone the repo and check out `rsk_integration`

### docker

```
sudo apt install -y docker docker-compose
```
optionally add user to docker group or add `sudo` to the docker commands in `package.json`

```
sudo usermod -aG docker $USER # exit shell and login again
```

### make and gcc
```
sudo apt-get install -y gcc g++ make rsync
```

### nvm and node

Use node 16.  

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

source ~/.bashrc

nvm --version
nvm install 16
```
### python
Python3 is used with `dataclasses` to build docker images.

For example on ubuntu
```
sudo apt install -y python3 python3-pip
```
install dataclasses

```
python3 -m pip install dataclasses
```

## Set up regtest environment

Move into project directory (clone repo and checkout dev branch if not already done)
```
git clone https://github.com/rootstock/boltz-backend.git
cd boltz-backend
git checkout rsk_integration 
```

install dependencies and build docker images
```
npm install --build-from-resource
npm run compile
./build_regtest.sh
```

Overwrite the hardhat config in `boltz-core` with RSK port
```
cp ./hardhat.config.ts node_modules/boltz-core/hardhat.config.ts
```

Deploy containers and fund accounts

```
#start
npm run docker:start
npm run docker:rskj:fundAcc
npm run docker:rskj:fund1
npm link
```

## Start backend server

```
#start
npm start

#in dev mode
npm run dev
```

### Initial server errors
If there are errors like  "*Error: the sender account doesn't exist*" or 
"*error: Could not initialize Boltz: Validation error*", they can be resoved as follows.

Stop and remove all containers
```
npm run docker:stop
```

Clean any existing Boltz DB 
```
rm /Users/<username>/Library/Application\ Support/Boltz/boltz.db #on mac
rm $HOME/.boltz/boltz.db # on linux
```
or run `./clean.sh`

restart containers, fund accounts, and then try starting the backend server again
```
npm run docker:start
npm run docker:rskj:fundAcc
npm run docker:rskj:fund1
npm start
```
### Thunderhub 
[Thunderhub](https://docs.thunderhub.io/) is a lightning node manager

```
# e.g. from home directory
git clone https://github.com/apotdevin/thunderhub.git
cd thunderhub
```

Create an `accounts.yaml` file, modify (or create if needed) environment file `.env`, and **start the app** following instructions in [README_ThunderHub.md](./README_ThunderHub.md)

### Postman
The postman environment and collections are in the `postman` directory. The relevant fields (e.g. *preimagehash*-es, addresses, etc) **must be changed appropriately** in the collection prior to making calls.


## Workflow for swaps
From the `boltz-backend` directory

### Reverse submarine swap

- Create a *preimage*
    - `boltz-cli newpreimage`
    - this returns 2 fields: *preimage* and *preimageHash*
- Create a *reverse swap*
    - look for `createswap` post in Postman
    - replace `preimageHash` with the previously generated **preimageHash**
    - and replace the rest of the fields if necessary (address for instance)
- Pay the *invoice*
    - The previous step returned a hash of an invoice (”invoice” field)
    - Take any LN client and pay it (e.g. using Thunderhub)
- *Claim* the RBTC on RSK chain using the original preimage
    - `boltz-ethereum-cli claim <**preimage**>`
    - where <preimage> is the one generated in the first step.
- More info: [https://docs.boltz.exchange/en/latest/lifecycle/#reverse-submarine-swaps](https://docs.boltz.exchange/en/latest/lifecycle/#reverse-submarine-swaps)


## Additional info: Developing on remote systems

### A CLI for postman
An alternative to using postman app is to use postman's [newman cli](https://www.postman.com/downloads/). This can be useful on remote systems and for CI and automated testing.

```
npm install -g newman
```

We can then run collections using newman from the command line. 

```
# Boltz Backend
newman run -e "postman/LND.postman_environment.json" --verbose "postman/Boltz Backend.postman_collection.json"

# RSK Node
newman run -e "postman/LND.postman_environment.json" --verbose "postman/RSK Node.postman_collection.json"
```

#### port forwarding
When developing or testing on remote systems, we can forward the following ports to interact with the services, like so

```
ssh -L 4444:127.0.0.1:4444   \ # rskj (via postman)
    -L 3000:127.0.0.1:3000   \ # thunderhub (via browser)
    -L 9001:127.0.0.1:9001   \ # Boltz (via postman)
    #-L 10009:127.0.0.1:10009 \ # LND (optional via postman), or just use thunderhub
    user@remote       #modify as per actual remote```
```

## Running tests

See `package.json` for test options. For example, use `npm run tests:int` to run integration tests

## Errors


### Error:
```
reason: 'processing response error',
  code: 'SERVER_ERROR',
  body: `{"jsonrpc":"2.0","id":71,"error":{"code":-32010,"message":"the sender account doesn't exist"}}\n`,
  error: Error: the sender account doesn't exist
```
Fix #1: (fund account)
```
""
npm run docker:rskj:fundAcc
npm run docker:rskj:fund1
```

Fix #2 (check mnemonic file):

`~/Library/Application\ Support/Boltz/seed.dat`

Every time you work with a fresh copy, a new seed is autogenerated and saved in that file. 
So if you look at the desc of `docker:rskj:fund1` for instance, you will see an address that corresponds to the seed autogenerated. 
So probably the address there should be changed in a fresh copy (derived from the seed file), thats my theory, didn’t try it yet. Among the logs there should be a transaction with error, the `to` field of that transaction should be the new address.


### Error:
```
error: Could not initialize Boltz: Validation error
name: 'SequelizeUniqueConstraintError',
  errors: [
    ValidationErrorItem {
      message: 'nonce must be unique',
      type: 'unique violation',
      path: 'nonce',
      value: 0,
      origin: 'DB',
      instance: [PendingEthereumTransaction],
      validatorKey: 'not_unique',
      validatorName: null,
      validatorArgs: []
    }
  ],
```

Clean DB 
```
rm /Users/<username>/Library/Application\ Support/Boltz/boltz.db #on mac
rm $HOME/.boltz/boltz.db # on linux
```
or run `./clean.sh`

### Error:
When running node v16, I get this:
```
Error: No native build was found for platform=darwin arch=x64 runtime=node abi=93 uv=1 libc=glibc node=16.15.0
    loaded from: /Users/patricio/workspace/research/payments/boltz-backend-rootstock/node_modules/zeromq
```
and with node v14:
```
/Users/patricio/workspace/research/payments/boltz-backend-rootstock/node_modules/discord.js/src/rest/APIRequest.js:34
    agent ??= new https.Agent({ ...this.client.options.http.agent, keepAlive: true });
          ^^^

SyntaxError: Unexpected token '??='
```
fix: 
```
npm install --build-from-resource
```


### Error:
```
Error: Debug Failure. False expression: Non-string value passed to `ts.resolveTypeReferenceDirective`, likely by a wrapping package working with an outdated `resolveTypeReferenceDirectives` signature. This is probably not a problem in TS itself.
```
fix: https://github.com/microsoft/TypeScript/issues/49257
```
npm install typescript@latest ts-node@latest
```



# Original Boltz documentation

[![CI](https://github.com/BoltzExchange/boltz-backend/workflows/CI/badge.svg?branch=master)](https://github.com/BoltzExchange/boltz-backend/actions)
[![Documentation Status](https://readthedocs.org/projects/boltz-backend/badge/?version=latest)](https://docs.boltz.exchange)
[![Discord](https://img.shields.io/discord/547454030801272832.svg)](https://discordapp.com/invite/QBvZGcW)
[![Version](https://img.shields.io/npm/v/boltz-backend.svg)](https://www.npmjs.com/package/boltz-backend)

Boltz is an open-source exchange solution for everyone. The goal of Boltz is to allow tech entrepreneurs as well as technically capable individuals to operate a digital asset exchange without requiring their users to trust them.

## Documentation

All of the documentation of Boltz can be found on [Read the Docs](https://docs.boltz.exchange/en/latest/)
