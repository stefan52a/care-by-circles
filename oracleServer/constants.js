module.exports = Object.freeze({
    VERSION: '0.11',
    SATOSHI_FORGENESIS: 7e4,
    
    DUST_SATOSHIS: 547, //547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311

    // For testClient:
    BASEURL: 'http://localhost:3000/api/',
    // BASEURL: 'https://www.carebycircle.com/api',
    DO_GENESIS: false,   ///<<====================================== set to true once to start, false in all subsequent calls

});