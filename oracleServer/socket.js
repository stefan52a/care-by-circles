//does not work

var bitcoin = require('bitcoinjs-lib');
var zmq = require('zeromq');
var sock = zmq.socket('sub');
var addr = 'tcp://127.0.0.1:8080';

// var bitcore = require('bitcoin-core');
// var RpcClient = require('bitcoind-rpc');

// var config = {
// protocol: 'http',
//    host: 'localhost',
//    port: 8080
//  };

// var rpc = new RpcClient(config);
// rpc.listunspent(function (err, ret) {
//     if (err) {
//       console.error(err);
//     } else{
//         a=ret;
//     }
// });

sock.connect(addr);
sock.subscribe('rawtx');
console.log('sock:', sock);
sock.on('message', function(topic, message) {
  console.log('topic:', topic.toString());
    if (topic.toString() === 'rawtx') {
        var rawTx = message.toString('hex');
        var tx = bitcoin.Transaction.fromHex(rawTx);
        var txid = tx.getId();
        console.log('received transaction', txid, tx);
    }
});