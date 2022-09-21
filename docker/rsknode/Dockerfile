FROM openjdk:8-jdk-slim-buster
RUN apt-get update -y && \
    apt-get install -y git curl gnupg && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove -y && \
    apt-get clean



WORKDIR /usr/local/rskj
RUN echo "Downloading rskj jar..."
RUN curl -L "https://github.com/rsksmart/rskj/releases/download/HOP-4.1.0/rskj-core-4.1.0-HOP-all.jar" --output ./rsk.jar
RUN echo "Downloaded rskj jar!"
COPY node.conf ./node.conf
COPY logback.xml ./logback.xml

RUN mkdir -p /root/.rsk/regtest/database
RUN chmod -R 777 /root/.rsk

HEALTHCHECK --interval=10s --timeout=120s --start-period=40s --retries=20 \
  CMD curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber", "params": {},  "id":123}' http://127.0.0.1:4444 || exit 1

ENTRYPOINT ["java", \
    "-Drsk.conf.file=./node.conf", \
    "-Dlogback.configurationFile=./logback.xml", \
    "-cp", "./rsk.jar", "co.rsk.Start" ]
