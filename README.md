# Care By Circles Oracle

Give & Take Care.

Also see https://CareByCircles.Com and https://youtu.be/YczwK4v-uJ0 and the accompanying client software https://gitlab.com/circle3/care-by-circle

Where the following specifications are not clear, valid or seemingly changed, always look at the code for the workings.


[![Promo Care By Circles](READMEImages/CareByCircles.gif)](https://youtu.be/YczwK4v-uJ0)

## Status ##
This work is Work in Progress, implemented is the blockchain part:
- Users creating a genesis Circle
- Users accepting other members in their Circle (to a maximum of 150, Dunbar's number)
- Storage of hashed data and Circle identification on a RSK RIF Swarm
- Consensus in the form of a contract

Foreseen, but not implemented is:
- Asking for help
- Expelling a member of a Circle by majority
- The concept is blocklchain agnostic, its implementation, can be made in RGB, Rootstock and even in Ethereum, but for the moment we will use a BTC fork (see the powerpoint for further reasoning) (we also considered counterparty or Elements, but scripts are not easily programmable in a client)
- When we will fork the BTC blockchain. current BTC holders will already have some Circle tokens, 
- Related to that: we need to think about replay protection
- Some tokens are 'freed' to be spent, such as the miner fee. They are not locked by the Oracle. The Oracle guards, via the agreed contract, the other remaining tokens.
- Unique identification of a person, for now this always returns true, see below

## Summary ##
Alice's coins will be locked with a Special script. Alice can only spend with that special script, transactions that are cosigned by the Oracle server and Alice. The spending (to let Bob join the Circle) is only cosigned by the Oracle when 1 of the following is satisfied (the contract):

- The Oracle decides whether Alice's publickey belongs to a CircleInstance a.o. stays under 150 (Dunbar's number) members. Then Alice gets some 'free" tokens and the remainder gets locked by a similarly Special script.

- The Oracle decides whether a majority (which is greater than half of all Circle members + 1) of publickeys belonging to a CircleInstance exists, that asks to spend the tokens locked with the Special script. If it is a majority: the Oracle cosigns the spending of the tokens towards the pubkeys of that majority.  (to expel a member)

Members agreeing in the Circle blockchain have consensus about the following:

- It follows the same rules as the Bitcoin blockchain, as of this writing
- When you join the system you get awarded ('airdropped') 1/100 Circle token, but only once. (unless you somehow change your id ;)
- This users' airdrop gets halved every 500k users entering the system.
- Alice (a user) should be able to invite other members (e.g. Bob & Charlie), they get some Oracle-locked tokens from Alice. Bob then gets half of Alice's tokens minus a miner fee.
- Not more than 150 people (Dunbar's number) may take part in 1 Circle
- Blockchain nodes cannot measure arbitrary conditions, so we must rely on an Oracle. An oracle is a server that has a keypair, and (co)signs transactions on request when a user-provided expression (contract) evaluates to true.
- A transaction is adding another person to one of your Circles

The Circle token is a fungible token, and is associated with identity. initially 1/100th (=1 million Satoshi) Circle token is associated with a telephone nr. (FTM to represent identity), but also e.g. 600 Satoshi1 token could be associated with an id.

Important is to consider that it will not be a simple single sign signature unlock script, but a multisig (either of Alice and the Oracle, where Alice invites Bob to join a Circle) or (Alice, Bob and Carol and the Oracle in a Circle of 5 (so they are a majority, and then can "expel" David)

The Circle blockchain is a fork of the Bitcoin blockchain.

## The Oracle server ##
This is an Express RESTful API server for the Oracle for Care By Circles, social inclusion.

An Oracle is any service that tries to execute a contract, a contract on which the users of this blockchain have consensus on.

Circles are tribes with a maximum of 150 (Dunbar's number) people each.

Next to that the Oracle currently also checks whether an Id is really 1 unique human.
An individual person's id is not stored as is on the blockchain or decentral storage.

## GDPR consideration ##
In order, however, to determine the uniqueness of an id, the Oracle needs to be knowledgable about the id. Therefore the Oracle stores the id along with a salt in a table only accessible to the Oracle.
The oracle enforces the uniqueness of the id. The user may withdraw the salt and the Oracle promises to delete the relationship between id and that salt, by which the data on his Circles in the blockchain is not retrievable anymore.
What gets stored in a decentral table, is:

circle instance  <->  Hash(id, salt)     relationship 

For the id it would be better to use some kind of DID system here (e.g. one using built-up reputation of a public key), but this is outside the scope ATM.

Under the hood it uses Bitcoin blockchain principles for consensus (on Dunbar's number) and Oracle contracts with Partially Signed Bitcoin Transactions (PSBT).

The Oracle needs to be trusted by people using it.

## Transactions ##
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

In context it looks like:

![Alt text](READMEImages/Transaction.jpg?raw=true "Transaction in context")


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

3. Run the accompanying client software https://gitlab.com/circle3/care-by-circle   or      run the testClient.js on our regtest server:

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

Remember the testClient can only be run twice: once with  DO_GENESIS: false,    and once with  DO_GENESIS: true,   

After that you can change the users id (AliceId, BobId and CharlieId), otherwise you will get:

```
======>Alice accepts Bob in her Circle
clientTest.js:125
Error Contract error: Not allowed (BobId already in this Circleinstance) Circled3bdb6b36cc2e24d7d6214b50da61737834c7c2a30b988993d907f45bc39cdd1bb9c49a1d82f67fe9952c173b6474d3f5749ce365eac7be675475f911d97ce401aa7a235fa07e549486936093c79d286d7ace48c25fae22d66f4a1069b0df10fa348cb8feca42d4ba650adc209fa66c7f2a534f772b8d5dda6dc6b9444b246130811ad557f234ccbda511e556283ace7e1794064a13dd40468b556b9b0f12e521c556eec93b89508b41b0b8afedd75d9f1acf136df19e2bdae0d19dbdfddcaf6ac88fcbf373a8bc3d867d6c9e48fd4bbdbbadb884e28f75ff1a16f42e6d97e035af4a26bf8814f21ee3dc418c362f2620ee7d6b41b0a9c80d39797e40b6ed46f
```

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

8. Be aware that if you often switch between local and remote regtest, that you should empty the client side database (see point 3).

## Ideas ##

- A transaction may contain binary metadata: should we allow owners of the asset add some additonal binary data to the as the "asset history" (like adding engravings to the owned token)
- A Circle can elect a specialist among itsself, who can go in a new Circle S with specialists from other Circles. Circle S can elect a superspecialist that form with other superspecilists a new Cicrle S2 etc. This will lead to a log(N) working direct democracy?

## Some literature: ##

Malcolm Gladwell's The Tipping Point: How Little Things Can  Make a Big Difference

‘The Dunbar Number as a Limit to Group Sizes’, Christopher Allen

Duncan J. Watts' Six  Degrees: The Science of a Connected Age

Small  Worlds: The Dynamics of Networks between Order and  Randomness

Mark Buchanan's Nexus: Small  Worlds and the Groundbreaking Science of Networks

Harari: Sapiens

van Mensvoort: Next Nature 


[![Promo Care By Circles](READMEImages/server.gif)]