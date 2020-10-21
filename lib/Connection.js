const MongoClient = require('mongoose')

class Connection {
    static connectToMongo() {
        MongoClient.connect(this.url, this.options, this.db, function (err, client) {
            if (err) { console.error(err) }
            db = client.connection.collection('Circles') // once connected, assign the connection to the global variable
        })
    }
    // {
    //     if ( this.db ) return Promise.resolve(this.db)
    //     return MongoClient.connect(this.url, this.options)
    //         .then(db => this.db = db)
    // }

    // // or in the new async world
    // static async connectToMongo() {
    //     if (this.db) return this.db
    //     this.db = await MongoClient.connect(this.url, this.options)
    //     return this.db
    // }
}

Connection.db = null
Connection.url = 'mongodb://localhost/carebycircles'
Connection.options = {
    bufferMaxEntries: 0,
    // reconnectTries:     5000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
}

module.exports = { Connection }

