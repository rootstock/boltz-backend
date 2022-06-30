# Boltz fork - Port to RSK

**Current status:** 
* Running setup in `regtest` mode. 
* Several TODO issues to work on.

## Setup for Ubuntu (e.g. Boton)

Clone the repo and check out `rsk_integration`. Tested on ubuntu (20.04 LTS).

### Install Docker

```
sudo apt install -y docker docker-compose
```
optionally add user to docker group or add `sudo` to the docker commands in `package.json`

```
sudo usermod -aG docker $USER # exit shell and login again
```

### Make and gcc
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

## Set up regtest environment

Move into project directory and install dependencies
```
cd boltz*

npm install
npm run compile
npm run docker:regtest:build
```

Then can start and stop regtest deployment as follows

```
#start
npm run docker:start

#stop
npm run docker:stop
```

## Start backend server

```
#start
npm start

#in dev mode
npm run compile && npm start
```


## Integration tests

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

I created a config file `config.toml` for running the backend. The settings are from `docs/regtest.md`. Note that deployment config will be different. 
For regtest environment, the 3 addresses of the 3 deployed contracts (`EtherSwap`, `ERC20Swap` and the `ERC20Token`) are added. These addresses are reproducible for a given private key + fresh deployment.


## Errors


### Error:
```
reason: 'processing response error',
  code: 'SERVER_ERROR',
  body: `{"jsonrpc":"2.0","id":71,"error":{"code":-32010,"message":"the sender account doesn't exist"}}\n`,
  error: Error: the sender account doesn't exist
```
Fix: (fund account)
```
    "docker:rskj:fundAcc": "./bin/boltz-ethereum send 1000 '0xdebe71e1de41fc77c44df4b6db940026e31b0e71' && ./bin/boltz-ethereum send 1000 '0xdebe71e1de41fc77c44df4b6db940026e31b0e71' --token && ./bin/boltz-ethereum send 1000 '0xaa73dfb3a60fDb7093892E4cc883160e13E67b31' --token && ./bin/boltz-ethereum send 1000 '0xaa73dfb3a60fDb7093892E4cc883160e13E67b31'",
```
Mnemonic: 
```
~/Library/Application\ Support/Boltz/seed.dat
```

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
rm /Users/<username>/Library/Application\ Support/Boltz/boltz.db
```


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
