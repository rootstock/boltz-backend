FROM openjdk:8-jdk-slim-buster
RUN apt-get update -y && \
    apt-get install -y git curl gnupg && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove -y && \
    apt-get clean



WORKDIR /usr/local/rskj
RUN echo "Downloading rskj jar..."
RUN curl -L "https://github.com/rsksmart/rskj/releases/download/IRIS-3.3.0/rskj-core-3.3.0-IRIS-all.jar" --output ./rsk.jar
RUN echo "Downloaded rskj jar!"
COPY node.conf ./node.conf
COPY logback.xml ./logback.xml

RUN mkdir -p /root/.rsk/regtest/database
RUN chmod -R 777 /root/.rsk

ENTRYPOINT ["java", \
    "-Drsk.conf.file=./node.conf", \
    "-Dlogback.configurationFile=./logback.xml", \
    "-cp", "./rsk.jar", "co.rsk.Start" ]
