# Care By Circles Oracle

See https://CareByCircles.Com

[![Promo Care By Circles](READMEImages/CareByCircles.gif)](https://youtu.be/YczwK4v-uJ0)

Express RESTful API server for CirclesOracle.

Oracle server for Care by Circles, social inclusion.

Circles are tribes with a maximum of 150 (Dunbar's number) people each.

All transactions are locked by the following scriptPub (to lock output):

```
IF
<oraclePleaseSignTx_hash> DROP
2 <ID pubkey> <oraclePleaseSignTx_pubkey> 2 CHECKMULTISIG
ELSE
<contractBurn_hash> DROP
n+1 <IDi pubkey> ..... <IDm pubkey><oracleBurn pubkey> m+1 CHECKMULTISIG
ENDIF
```
where n>m/2

PSBT transaction which is partially to be signed by the Oracle oraclePleaseSignTx, looks like:

![Alt text](READMEImages/ToBeSignedPSBT.jpg?raw=true "Transaction")


Also includes a simple web application (WIP)

## Usage ##
1. Setup a BTC regtest server with junderw who maintains an image of a Dockerfile as junderw/bitcoinjs-regtest-server on Docker Hub.

Downloads the image from docker hub automatically:
```
docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server
```

2. Clone or download and run **npm install** 

3. Install and run mongodb locally:
https://docs.mongodb.com/manual/administration/install-community/

4. Run a regtest server, e.g.:

docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server


For your information: you can go into the docker by:

a. get the CONTAINER_ID by

docker container ls

b. then

docker exec -it CONTAINER_ID bash

and then inside the docker you can execute commands like:

bitcoin-cli -regtest help

5.  Run the Oracle server 

node oracle.js    #or use your favorite debugger

6. Run a client or a test e.g.:

cd test

node clientTest   #or use your favorite debugger