module.exports = Object.freeze({
    VERSION: '0.12q',
    SATOSHI_FOR_GENESIS: 1e6,
    ENTRY_COST_FACTOR: 0.5, // To let someone in your Circle costs you ENTRY_COST_FACTOR'th of your tokens
    DUST_SATOSHIS: 547, //547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311

    LOCK_MAX_PENDING: 1000,   // maximum number of waiting users consurrently waiting in the contract on checking whether a user to be added to a Circle results in more than 150 Circle members
                                // suppose 3.5 billion people try to add another member, then 1000 is a little low but we have a limited computer power FTM
    LOCK_TIMEOUT: 10000,       

    // For testClient:
    BASE_URL: 'http://localhost:3000/api/',
    // BASEURL: 'https://www.carebycircle.com/api',
    DO_GENESIS: false,   ///<<====================================== set to true once to start, false in all subsequent calls

});