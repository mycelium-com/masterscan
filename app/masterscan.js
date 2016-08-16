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

const UnspentOutput = Transaction.UnspentOutput;

const Mnemonic = require('bitcore-mnemonic');

class Masterscan {

    constructor(masterSeed, network = Networks.defaultNetwork, insight) {
        this.coinid = network === Networks.livenet ? 0 : 1;
        this.context = {network:network, insight: insight};
        this.masterseed = new Mnemonic(masterSeed);  // throws bitcore.ErrorMnemonicUnknownWordlist or bitcore.ErrorMnemonicInvalidMnemonic if not valid
        this.rootnode =  this.masterseed.toHDPrivateKey("", network);
        this.maxAccountGap = 5;
        this.maxChainGap = {external: 25, change: 5};
        this.bip44Accounts = new Accounts();
        this.accounts = new Accounts();
    }

    scan(progressCallBack){
        const slowProgressCallBack = _.debounce( ()=> {
            if (progressCallBack){
                progressCallBack(this.accounts);
            }
        }, 200);
        return this.scanInt(slowProgressCallBack);
    }

    scanInt(progressCallBack){
        //this.accounts.push(this.initRootAccount());
        this.extendAccounts(this.maxAccountGap);
        progressCallBack();

        var req = [];
        for (var i in this.accounts){
            req.push(this.accounts[i].scanAccount(progressCallBack));
        }

        return Promise.all(req).then(() => {
            if (this.isFullySynced) {
                console.log(this.accounts);
                console.log(this.accounts[0].getUtxo());
                return this.accounts;
            } else {
                // scan until there is a big enough account gap
                return this.scanInt(progressCallBack);
            }
        });
    }

    // checks if there are at least $gap addresses synced but with out balance after the last address with balance
    get isFullySynced(){
        var lastWithActivity = 0;
        var finalGap = -1;
        for (var a in this.accounts){
            var ak = this.accounts[a];
            if (ak.wasUsed){
                lastWithActivity = a;
            }
            if ((!ak.wasUsed && ak.state=='sync') || ak.state=='err'){
                finalGap = a - lastWithActivity;
            }
        }
        return finalGap >= this.maxAccountGap;
    }

    extendAccounts(cnt){
        while (cnt > 0) {
            var account = this.initBip44Account(this.bip44Accounts.length);
            this.accounts.push(account);
            this.bip44Accounts.push(account);
            cnt--
        }
    }

    initRootAccount(){
        return new Account(this.rootnode, this.maxChainGap, 'm', "Root account", this.context);
    }

    initBip44Account(idx){
        var path = `m/44'/${this.coinid}'/${idx}'`
        var accountRoot = this.rootnode.derive(path);
        return new Account(accountRoot, this.maxChainGap, path, "Account " + idx, this.context);
    }

    prepareTx(utxoSet, keyBag, dest, feePerByte){

        function mapUtxo(utxo){
            return new UnspentOutput({
                txid:utxo.txid,
                address:utxo.address,
                outputIndex:utxo.vout,
                satoshis:utxo.satoshis,
                sequenceNumber:0xffff,
                script:utxo.scriptPubKey,
            })
        }

        return new Promise((okay, fail) => {
            var transaction = new bitcore.Transaction();
            for (var i in utxoSet.utxoArray) {
                transaction.from(mapUtxo(utxoSet.utxoArray[i]));
            }
            transaction.to(dest, utxoSet.totalAmount);
            transaction.sign(keyBag);

            // fee calculation
            const txSize = transaction.toBuffer().length;
            const feeSat = feePerByte * txSize;
            // remove the previous output and add it again, but with totalAmount reduced by calculated fee
            transaction.clearOutputs();
            transaction.to(dest, utxoSet.totalAmount - feeSat);
            // Sign again
            transaction.sign(keyBag);

            okay(transaction);
        });
    }

    static fetchFee(blocks=2, insight){
        return insight.getFeeEstimate(blocks)
            .then(d => {
                return Math.ceil(d[blocks] * 100000000 / 1024)
            });
    }

    static broadcastTx(tx, insight){
        return insight.sendTransaction(tx, this.context.url);
    }

}

class UtxoSet{
    constructor(utxos){
        this.utxoArray = utxos || [];
    }

    get totalAmount(){
        var total=0;
        for (var i in this.utxoArray){
            total += this.utxoArray[i].satoshis;
        }
        return total;
    }

    get length(){
        return this.utxoArray.length;
    }

    concat(other){
        return new UtxoSet(this.utxoArray.concat(other.utxoArray));
    }
}

class Accounts extends Array{
    constructor(){
        super();
    }

    getUtxo(){
        var all = new UtxoSet([]);
        for (const i in this){
            all = all.concat(this[i].getUtxo());
        }
        return all;
    }

    getActiveUtxo(){
        var all = new UtxoSet([]);
        for (const i in this){
            if (this[i].active) {
                all = all.concat(this[i].getUtxo());
            }
        }
        return all;
    }

    getByPath(path){
        return _.find(this, e => e.path == path);
    }

    get numUsedAccounts(){
        var cnt=0;
        for (const i in this){
            if (this[i].wasUsed) cnt++;
        }
        return cnt;
    }

    get balance(){
        var total = 0;
        for (const i in this){
            total += this[i].balance;
        }
        return total;
    }
}

class Account{
    constructor(root, gaps, path, name, context){
        this.root = root;
        this.gaps = gaps;
        this.path = path;
        this.context = context;
        this.name = name;
        this.active = true; // include it in the UTXO set
        this.external = new Chain(root.derive('m/0'), gaps.external, path + '/0', this.context);
        this.change = new Chain(root.derive('m/1'), gaps.change, path + '/1', this.context);
    }

    get wasUsed() {
        return this.external.wasUsed || this.change.wasUsed;
    }

    get keyBag() {
        return this.external.keyBag.concat(this.change.keyBag);
    }

    get state() {
        var states = [{state:this.external.state}, {state:this.change.state}];
        return Chain.significantState(states);
    }

    get balance(){
        return this.getUtxo().totalAmount;
    }

    getUtxo(){
        return this.external.getAllUtxo().concat(this.change.getAllUtxo());
    }

    scanAccount(progressCallBack){
        if (this.external.isFullySynced && this.change.isFullySynced){
            return Promise.resolve(true);
        }
        //const status = progressCallBack;
        var ext = this.scanChain(this.external, progressCallBack);
        var change = this.scanChain(this.change, progressCallBack);
        return Promise.all([ext, change])
            .then(() => {
                if (this.external.isFullySynced && this.change.isFullySynced){
                    return true;
                } else {
                    // scan until everything is fully synced
                    return this.scanAccount(progressCallBack);
                }
            });

    }

    scanChain(chain, progressCallBack) {
        if (chain.isFullySynced) {
            return Promise.resolve(true);
        }

        var toScan = chain.getAddressesToScan();
        if (toScan.length == 0){
            chain.extend();
            toScan = chain.getAddressesToScan();
        }


        var req = [];
        for (var i in toScan){
            const ak = toScan[i];
            ak.state = 'scan';
            req.push(
                this.context.insight.isAddressUsed(ak.addr)
                    .then(d => {
                        ak.balance = d.balanceSat;
                        ak.totalRecv = d.totalReceivedSat + d.unconfirmedBalanceSat;
                        if (ak.totalRecv > 0) {
                            ak.state = 'getutxo';
                            return this.context.insight.getUTXOs([ak.addr])
                                .then(u => {
                                    ak.utxo = u;
                                    ak.state = 'sync';
                                });
                        } else {
                            ak.state = 'sync';
                        }

                        if (progressCallBack) {
                            progressCallBack()
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
    constructor(root, gap, path, context){
        this.root = root;
        this.gap = gap;
        this.path = path;
        this.context = context;
        this.addresses = [];
        this.keyBag = [];
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

    get state() {
        return Chain.significantState(this.addresses);
    }

    static significantState(arr) {
        var stateCount = {}
        for (var a in arr){
            if (!stateCount[arr[a].state]) stateCount[arr[a].state] = 0;
            stateCount[arr[a].state] ++;
        }
        if (stateCount['err'] > 0) return 'err';
        if (stateCount['scan'] > 0) return 'scan';
        if (stateCount['getutxo'] > 0) return 'scan'; // also scan... dont care what we are doing
        if (stateCount['unk'] > 0) return 'unk'; // also scan... dont care what we are doing
        // no other state found, we must be sync
        return 'sync';
    }

    extend(){
        var addressCnt = 0;
        var idx = this.length;
        var reqs = [];
        while(addressCnt < this.gap){
            var node = this.root.derive(`m/${idx}`);
            var addr = node.hdPublicKey.publicKey.toAddress(this.context.network).toString();
            this.addresses.push({addr: addr, path: this.path + '/' + idx, idx:idx, utxo:null, balance:null, totalRecv:null, state: 'unk'});
            this.keyBag.push(node.privateKey);
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
        return new UtxoSet(ret);
    }

    getAddressesToScan(){
        var ret = [];
        for (var a in this.addresses){
            if (this.addresses[a].state == 'unk') {
                ret.push(this.addresses[a]);
            }
        }
        return ret;
    }

    // checks if there are at least $gap addresses synced but with out balance after the last address with balance
    get isFullySynced(){
        var lastWithActivity = 0;
        var finalGap = -1;
        for (var a in this.addresses){
            var ak = this.addresses[a];
            if (ak.totalRecv > 0){
                lastWithActivity = a;
            }
            if ((ak.totalRecv == 0 && ak.state=='sync') || ak.state=='err'){
                finalGap = a - lastWithActivity + 1;
            }
        }
        return finalGap >= this.gap;
    }
}

module.exports = Masterscan;