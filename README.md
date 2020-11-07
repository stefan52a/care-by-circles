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

3. Run testClient.js on our regtest server:

adapt constants.js to

```
module.exports = Object.freeze({
    VERSION: '0.11',
    SATOSHI_FORGENESIS: 7e4,

    // For testClient:
    // BASEURL: 'https://www.carebycircle.com/api',
    DO_GENESIS: false,   ///<<====================================== set to true once to start, false in all subsequent calls
});
```
```
node clientTest   #or use your favorite debugger
```

Then you need to set up a local mongodb, for this in clienTest.js to work:
```
MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true, useUnifiedTopology: true }, function (err, database) {
    if (err) throw err;

    db = database.db("carebycircles");
    CirclesClientCollection = db.collection("clientData");

    // Start the application after the database connection is ready
    run();
});
```

Of course you can use any other database, like sqllite, or table for client side storage.

Adapt clientTest.js to your heart's desire. You are Done.

If you want to run locally:

4. Install and run mongodb locally, see for instructions: https://docs.mongodb.com/manual/administration/install-community/

5. Run a regtest server, e.g.:

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

6.  Run the Oracle server 

```
cd oracleServer
node oracle.js    #or use your favorite debugger
```

7. Run a client or a test e.g.:

adapt constants.js to

```
module.exports = Object.freeze({
    VERSION: '0.11',
    SATOSHI_FORGENESIS: 7e4,

    // For testClient:
    BASEURL: 'http://localhost:3000/api/',
    DO_GENESIS: true,   ///<<====================================== set to true once to start, false in all subsequent calls

});
```

```
node clientTest   #or use your favorite debugger
```

8. Be aware that if you often switch between local and remote regtest, that you empty the client side database (see point 3).