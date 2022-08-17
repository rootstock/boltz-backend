FROM node:16-bullseye-slim as builder

RUN apt-get update && apt-get -y upgrade
RUN apt-get -y install rsync git gcc g++ make libc-dev python3

#RUN git clone --depth=1 https://github.com/BoltzExchange/boltz-backend.git

COPY ./.git /boltz-backend/.git
COPY ./hardhat.config.ts /boltz-backend/hardhat.config.ts
COPY ./jest.config.js /boltz-backend/jest.config.js
COPY ./parseGitCommit.js /boltz-backend/parseGitCommit.js
COPY ./protos.js /boltz-backend/protos.js
COPY ./tslint.json /boltz-backend/tslint.json
COPY ./tsconfig.json /boltz-backend/tsconfig.json
COPY ./package-lock.json /boltz-backend/package-lock.json
COPY ./package.json /boltz-backend/package.json
RUN mkdir /boltz-backend/lib

WORKDIR boltz-backend

#RUN npm ci
RUN npm i

COPY ./contracts /boltz-backend/contracts
COPY ./lib /boltz-backend/lib
COPY ./bin /boltz-backend/bin
COPY ./config.toml /boltz-backend/config.toml

RUN npm run compile

FROM node:16-bullseye-slim as final

COPY --from=builder /boltz-backend /boltz-backend

WORKDIR /

EXPOSE 9000 9001

ENTRYPOINT ["/boltz-backend/bin/boltzd", "--configpath", "./boltz-backend/config.toml"]
