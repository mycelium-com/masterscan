'use strict';

const _ = require('lodash');

const bitcore = require('bitcore-lib');
const {
    HDPrivateKey,
    Networks,
    Unit,
    Transaction,
    Block,
} = bitcore;

const Mnemonic = require('bitcore-mnemonic');

class Masterscan {
    constructor(masterSeed, network = Networks.defaultNetwork) {
        const coin = network === Networks.livenet ? 0 : 1;
        this.masterseed = new Mnemonic(masterSeed);  // throws bitcore.ErrorMnemonicUnknownWordlist or bitcore.ErrorMnemonicInvalidMnemonic if not valid
        this.rootnode =  this.masterseed.toHDPrivateKey(network)
    }
}

module.exports = Masterscan;