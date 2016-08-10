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

const Rx = require('rxjs/Rx');

const Mnemonic = require('bitcore-mnemonic');
const Insight = require('./insightApi.js');

class Masterscan {

    constructor(masterSeed, network = Networks.defaultNetwork) {
        this.coinid = network === Networks.livenet ? 0 : 1;
        this.network = network;
        this.masterseed = new Mnemonic(masterSeed);  // throws bitcore.ErrorMnemonicUnknownWordlist or bitcore.ErrorMnemonicInvalidMnemonic if not valid
        this.rootnode =  this.masterseed.toHDPrivateKey("", network)
        this.maxAccountGap = 5;
        this.maxChainGap = {external: 20, change: 20};
    }

    scan(resultCallback, statusCallback){
        var accountGap = 0;
        var idx = 0;
        var accounts = [];

        //accounts.push(this.initRootAccount());

        while(accountGap < this.maxAccountGap){
            var account = this.initBip44Account(idx);
            if (!account.wasUsed) {
                accountGap ++;
            } else {
                accountGap = 0;
            }
            accounts.push(account)
            idx++;
        }
        this.scanAccount(accounts[0]).then(d => {
            console.log(d);
            console.log(accounts);
            console.log(this.getAccountUtxo(accounts[0]));
        });



        /*
        Insight.getUTXOs(['mjbw5R3Jmj3NwnwN1Ux4gMv4fptyMgQiwf']).then(function(d){
            console.log(d);
        });
        Insight.isAddressUsed('mjbw5R3Jmj3NwnwN1Ux4gMv4fptyMgQiwf').then(function(d){
            console.log(d);
        })
        */
    }

    initRootAccount(){
        return this.initAccount(this.rootnode, 'm');
    }

    initBip44Account(idx){
        var path = `m/44'/${this.coinid}'/${idx}'`
        var accountRoot = this.rootnode.derive(path);
        return this.initAccount(accountRoot, path);
    }

    initAccount(accountRoot, path) {
        var external = new Chain(accountRoot.derive('m/0'), this.maxChainGap.external, path + '/0', this.network);
        var change = new Chain(accountRoot.derive('m/1'), this.maxChainGap.change, path + '/1', this.network);
        return {wasUsed: external.wasUsed || change.wasUsed, root:accountRoot, external:external, change:change};
    }

    getAccountUtxo(account){
        return account.external.getAllUtxo()
            .concat(account.change.getAllUtxo());
    }

    scanAccount(account){
        if (account.external.isFullySynced && account.internal.isFullySynced){
            return Promise.resolve(true);
        }

        var ext = this.scanChain(account.external);
        var change = this.scanChain(account.change);
        return Promise.all([ext, change])
            .then(d => {
                if (account.external.isFullySynced && account.change.isFullySynced){
                    return true;
                } else {
                    // scan until everything is fully synced
                    return this.scanAccount(account);
                }
            });

    }

    scanChain(chain) {
        if (chain.isFullySynced) {
            return Promise.resolve(true);
        }

        var toScan = chain.getAddressesToScan();
        if (toScan.length < 10){
            chain.extend();
            toScan = chain.getAddressesToScan();
        }


        var req = [];
        for (var i in toScan){
            const ak = toScan[i];
            ak.state = 'scan';
            req.push(
                Insight.isAddressUsed(ak.addr)
                    .then(d => {
                        ak.balance = d.balanceSat;
                        ak.totalRecv = d.totalReceivedSat;
                        if (ak.totalRecv > 0 || d.unconfirmedBalanceSat > 0) {
                            ak.state = 'getutxo';
                            return Insight.getUTXOs([ak.addr])
                                .then(u => {
                                    ak.utxo = u;
                                    ak.state = 'sync';
                                });
                        } else {
                            ak.state = 'sync';
                        }
                    })
                    .catch(e => {
                        ak.state='err';
                        ak.err = e;
                    })
            );
        }

        return Promise.all(req);
    }
}

class Chain{

    constructor(root, gap, path, network){
        this.root = root;
        this.gap = gap;
        this.path = path;
        this.network = network;
        this.addresses = [];
        this.extend();
    }

    get wasUsed(){
        for (var a in this.addresses){
            if (this.addresses[a].totalRecv > 0) return true;
        }
        return false;
    }

    get length() {
        return this.addresses.length;
    }

    extend(){
        var addressCnt = 0;
        var idx = this.length;
        var reqs = [];
        while(addressCnt < this.gap){
            var addr = this.root.derive(`m/${idx}`).hdPublicKey.publicKey.toAddress(this.network).toString();
            this.addresses.push({addr: addr, path: this.path + '/' + idx, idx:idx, utxo:null, balance:null, totalRecv:null, state: null});
            addressCnt++;
            idx++;
        }
    }

    getAllUtxo() {
        var ret = [];
        for (var a in this.addresses){
            if (this.addresses[a].utxo != null && this.addresses[a].utxo.length > 0) {
                $.each(this.addresses[a].utxo, (k,v) => v.addrPath = this.addresses[a].path);

                ret = ret.concat(this.addresses[a].utxo);
            }
        }
        return ret;
    }

    getAddressesToScan(){
        var ret = [];
        for (var a in this.addresses){
            if (this.addresses[a].state == null) {
                ret.push(this.addresses[a]);
            }
        }
        return ret;
    }

    // checks if there are at least $gap addresses synced but with out balance after the last address with balance
    get isFullySynced(){
        var lastWithBalance = 0;
        var finalGap = -1;
        for (var a in this.addresses){
            var ak = this.addresses[a];
            if (ak.balance > 0){
                lastWithBalance = ak;
            }
            if (ak.balance == 0 && ak.state=='sync'){
                finalGap = a - lastWithBalance;
            }
        }
        return finalGap >= this.gap;
    }
}

module.exports = Masterscan;