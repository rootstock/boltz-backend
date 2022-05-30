docker build -t rskj:latest .

docker run -d --name rskj -p 4444:4444 -p 4445:4445 rskj:latest