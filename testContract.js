const contract = require('./oracleServer/ExamplecontractExample');

contract.contract("circleId", "BobId", "saltBob", (dummy, errInContract) => {
    if (errInContract) {
        console.log({ error: errInContract })
    }
})
