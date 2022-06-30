#!/bin/bash

source utils.sh

startNodes

bitcoin-cli loadwallet $DEFAULT_WALLET_NAME > /dev/null
#elements-cli loadwallet $DEFAULT_WALLET_NAME > /dev/null

startLnds

echo "Opening BTC channel"
openChannel bitcoin-cli \
  "lncli --lnddir=/root/.lnd-btc --rpcserver=127.0.0.1:10009 --network=regtest" \
  "lncli --lnddir=/root/.lnd-btc --rpcserver=127.0.0.1:10011 --network=regtest" \
  9736

mkdir -p /cookies
cp /root/.bitcoin/regtest/.cookie /cookies/.bitcoin-cookie
#cp /root/.elements/liquidregtest/.cookie /cookies/.elements-cookie

chmod 777 /cookies/.*

while true; do
  sleep 1
done
