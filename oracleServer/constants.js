module.exports = Object.freeze({
    VERSION: '0.11',
    SATOSHI_FOR_GENESIS: 1e6,
    ENTRY_COST_FACTOR: 0.5, // To let someone in your Circle costs you ENTRY_COST_FACTOR'th of your tokens
    DUST_SATOSHIS: 547, //547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311

    // For testClient:
    BASE_URL: 'http://localhost:3000/api/',
    // BASEURL: 'https://www.carebycircle.com/api',
    DO_GENESIS: false,   ///<<====================================== set to true once to start, false in all subsequent calls

});