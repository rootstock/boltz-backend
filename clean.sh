echo 'Cleaning env...'
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
rm $HOME/.boltz/boltz.db #on unix

elif [[ "$OSTYPE" == "darwin"* ]]; then
rm ~/Library/Application\ Support/Boltz/boltz.db #on mac
fi
echo 'Env cleaned.'
