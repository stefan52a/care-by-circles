# Care By Circles Oracle

Express RESTful API server for CirclesOracle.

Oracle server for Care by Circles, social inclusion.

Circles are tribes with a maximum of 150 people each.

All transactions are locked by the following scriptPubKey (to lock output):

```
IF
<oraclePleaseSignTx_hash> DROP
2 <ID pubkey> <oraclePleaseSignTx_pubkey> 2 CHECKMULTISIG
ELSE
<contractBurn_hash> DROP
n +1 <IDi pubkey> ..... <IDn pubkey><oracleBurn pubkey> m+1 CHECKMULTISIG
ENDIF
```

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

(and if you want then **node app** to start the web application)