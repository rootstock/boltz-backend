### Install ThunderHub (lnd client)

- git clone [https://github.com/apotdevin/thunderhub.git](https://github.com/apotdevin/thunderhub.git)
- `cd thunderhub`
- create `accounts.yaml` file:

- **note**: replace <workspace> and edit to match your actual *path* .

```yaml
masterPassword: 1234
accounts:
  - name: Account 1
    serverUrl: 127.0.0.1:10009
    macaroonPath: >-
      <workspace>/boltz-backend/docker/regtest/data/lnd/macaroons/admin.macaroon
    certificatePath: >-
      <workspace>/boltz-backend/docker/regtest/data/lnd/certificates/tls.cert
    password: 1234
  - name: Account 2
    serverUrl: 127.0.0.1:10011
    macaroonPath: >-
      <workspace>/boltz-backend/docker/regtest/data/lnd/macaroons/admin.macaroon
    certificatePath: >-
      <workspace>/boltz-backend/docker/regtest/data/lnd/certificates/tls.cert
    password: 1234
```

Note: if there are errors reading the file, then try placing the parameters within quotes e.g. "Account 1" or '1234'


- modify (or create if missing) `.env` file:
    
```jsx
ACCOUNT_CONFIG_PATH='<workspace>/thunderhub/accounts.yaml'
SSO_SERVER_URL='127.0.0.1:10009'
SSO_CERT_PATH='<workspace>/boltz-backend/docker/regtest/data/lnd/certificates/tls.cert'
SSO_MACAROON_PATH='<workspace>/boltz-backend/docker/regtest/data/lnd/macaroons'
```
    
- **note**: replace <workspace> with your real *workspace path*.

## install and run

```
npm install
npm run build
npm start
```

- more doc : [http://docs.thunderhub.io/](http://docs.thunderhub.io/)