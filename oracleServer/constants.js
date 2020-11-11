module.exports = Object.freeze({
    VERSION: '0.13',
    SATOSHI_FOR_GENESIS: 1e6,
    ENTRY_COST_FACTOR: 0.5, // To let someone in your Circle costs you ENTRY_COST_FACTOR'th of your tokens
    DUST_SATOSHIS: 547, //547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311

    LOCK_MAX_PENDING: 1000, // max number of users waiting on a lock, todo: DDOS danger!!
    LOCK_TIMEOUT: 10000,       

    // For testClient:
    BASE_URL: 'http://localhost:3000/api/',
    // BASE_URL: 'https://www.carebycircle.com/api/',
});