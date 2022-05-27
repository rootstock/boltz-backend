FROM openjdk:8-jdk-slim-buster as build
RUN apt-get update -y && \
    apt-get install -y git curl gnupg && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove -y && \
    apt-get clean

RUN gpg --keyserver https://secchannel.rsk.co/SUPPORT.asc --recv-keys 1DC9157991323D23FD37BAA7A6DBEAC640C5A14B
RUN gpg --finger 1DC9157991323D23FD37BAA7A6DBEAC640C5A14B

ARG rskj_codename=SNAPSHOT
ARG rskj_version=4.1.0
ARG working_branch=master

RUN git clone --single-branch --depth 1 --branch "${working_branch}" https://github.com/rsksmart/rskj.git /code/rskj

WORKDIR /code/rskj

RUN gpg --verify SHA256SUMS.asc
RUN sha256sum --check SHA256SUMS.asc
RUN ./configure.sh
RUN ./gradlew --no-daemon clean build -x test

FROM openjdk:8-jdk-slim-buster

ARG rskj_codename=SNAPSHOT
ARG rskj_version=4.1.0

WORKDIR /usr/local/rskj
COPY --from=build /code/rskj/rskj-core/build/libs/rskj-core-${rskj_version}-${rskj_codename}-all.jar ./rsk.jar
COPY node.conf ./node.conf
COPY logback.xml ./logback.xml

RUN mkdir -p /root/.rsk/regtest/database
RUN chmod -R 777 /root/.rsk

ENTRYPOINT ["java", \
    "-Drsk.conf.file=./node.conf", \
    "-Dlogback.configurationFile=./logback.xml", \
    "-cp", "./rsk.jar", "co.rsk.Start" ]
