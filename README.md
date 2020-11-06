# Care By Circles Oracle

Give & Take Care.

See https://CareByCircles.Com and https://youtu.be/YczwK4v-uJ0


[![Promo Care By Circles](READMEImages/CareByCircles.gif)](https://youtu.be/YczwK4v-uJ0)

Express RESTful API server for the Oracle for Care By Circles, social inclusion.

Circles are tribes with a maximum of 150 (Dunbar's number) people each.

An individual person's id is not stored as is on the blockchain or decentral storage.

GDPR consideration:
In order, however, to determine the uniqueness of an id, the Oracle needs to be knowledgable about the id. Therefore the Oracle stores the id along with a salt in a table only accessible to the Oracle.
The oracle enforces the uniqueness of the id. The user may withdraw the salt and the Oracle promises to delete the relationship between id and that salt, by which the data on his Circles in the blockchain is not retrievable anymore.
What gets stored in a decentral table, is:

circle instance  <->  Hash(id, salt)     relationship 

For the id it would be better to use some kind of DID system here, but this is outside the scope ATM.

Under the hood it uses Bitcoin blockchain principles for consensus (on Dunbar's number) and Oracle contracts with Partially Signed Bitcoin Transactions (PSBT).

The Oracle needs to be trusted by people using it.

Transactions are locked by the following scriptPub (to lock output):

```
IF
<contractPleaseSign_hash> DROP
2 <ID pubkey> <oraclePleaseSignTx_pubkey> 2
ELSE
<contractBurn_hash> DROP
n+1 <IDi pubkey> ..... <IDm pubkey><oracleBurn pubkey> m+1
ENDIF
CHECKMULTISIG
```
where n>m/2, and contractPleaseSign_hash is the hash of:

```
const ID = require('./identification');
module.exports.contract = (newId, callback) => {
    const dunbarsNumber = 150; 
    ID.checkExists(newId, (err) => {
        if (err) callback('', err + ' Contract error: Not allowed (newId does not exist)');
        ID.hasGenesisCircle(newId, (err, circleId) => {
            if (err) callback('', err + ' Contract error:  Not allowed (NewId already in Circleinstance) ' + circleId);
            else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Contract error: Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId);
            else callback(PSBT);
        });
    });
}
```

PSBT transaction which is partially to be signed by the Oracle oraclePleaseSignTx, looks like:

![Alt text](READMEImages/ToBeSignedPSBT.jpg?raw=true "Transaction")



## Usage ##
1. Setup a BTC regtest server with junderw who maintains an image of a Dockerfile as junderw/bitcoinjs-regtest-server on Docker Hub.

    For that download the image from docker hub automatically:
```
docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server
```

2. Clone or download and run 
```
npm install
```

3. Install and run mongodb locally, see for instructions: https://docs.mongodb.com/manual/administration/install-community/

4. Run a regtest server, e.g.:

```
docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server
```

For your information: you can go into the docker by:

- get the CONTAINER_ID by

```
docker container ls
```
- then

```
docker exec -it CONTAINER_ID bash
```

- and then inside the docker you can execute commands like:

```
bitcoin-cli -regtest help
```

5.  Run the Oracle server 

```
cd oracleServer
node oracle.js    #or use your favorite debugger
```

6. Run a client or a test e.g.:

```
node clientTest   #or use your favorite debugger
```