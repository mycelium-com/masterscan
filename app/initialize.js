'use strict';

const bitcore = require('bitcore-lib');
const {
    HDPrivateKey,
    Networks,
    Unit,
    Transaction,
    Block,
    Address
} = bitcore;



document.addEventListener('DOMContentLoaded', function() {
    alert(Address.isValid("1Motest"));
});
