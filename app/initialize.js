'use strict';


const Handlebars = require('handlebars');
const jQuery = require('jquery');
const $ = jQuery;
window.$ = window.jQuery = jQuery;  // workaround for browserify

const _ = require('lodash');

// Bootstrap
const bootstrap = require('bootstrap');
const styleBs = require('../node_modules/bootstrap/dist/css/bootstrap.css'); //cssify
require('bootstrap');

const toastr = require('toastr');
const styleToastr = require('../node_modules/toastr/build/toastr.css'); //cssify


const bitcore = require('bitcore-lib');
const {
    HDPrivateKey,
    Networks,
    Unit,
    Transaction,
    Block,
    Address
} = bitcore;

const Masterscan = require('./masterscan');

const cfg = {
    network: bitcore.Networks.testnet
    //network : bitcore.Networks.livenet
};

var scanner = null;
var lastResult = null;
var lastTransaction = null;

document.addEventListener('DOMContentLoaded', function () {
    const ui = {
        txRootNode: $('#txRootNode'),
        txReceiverAddress: $('#txReceiverAddress'),
        txTransaction: $('#txTransaction'),
        txFeePerByte: $('#txFeePerByte'),
        btnScan: $('#btnScan'),
        btnUpdateTransaction: $('#btnUpdateTransaction'),
        btnSendTransaction: $('#btnSendTransaction'),
        lblRootKeyInfo: $('#lblRootKeyInfo'),
        lblRootKeyInfoError: $('#lblRootKeyInfoError'),
        divAccounts: $('#accounts'),
        divUtxos: $('#utxos'),
        spTotalFee: $('#spTotalFee'),
        spPercentageFee: $('#spPercentageFee'),
        spSendingAmount: $('#spSendingAmount'),
        spTxSize: $('#spTxSize'),
        aCheckTx: $('#aCheckTx'),
    };

    const tmpl = {
        accounts: Handlebars.compile($("#accounts-template").html()),
        utxos: Handlebars.compile($("#utxos-template").html()),
        addresslist: Handlebars.compile($("#addresslist-template").html()),
    };

    toastr.options.timeOut = 30;
    toastr.options.extendedTimeOut = 0;
    toastr.options.closeButton = true;

    Handlebars.registerPartial('addresses', tmpl.addresslist);

    function link(url, tx, css) {
        return new Handlebars.SafeString("<a href='" +
            Handlebars.escapeExpression(url) +
            "' target='_blank' class='" +
            (css || "") +
            "'>" +
            Handlebars.escapeExpression(tx) +
            "</a>"
        );
    };

    Handlebars.registerHelper('txLink', function (txid, text) {
        const ll = link("http://tbtc.blockr.io/tx/info/" + txid, text || txid);
        return ll;
    });

    Handlebars.registerHelper('addrHiddenLink', function (addr, text) {
        const ll = link("http://tbtc.blockr.io/address/info/" + addr, text || addr, "hiddenLink");
        return ll;
    });

    const formatSatoshi = function (sats) {
        return sats / 100000000 + " BTC";
    };

    Handlebars.registerHelper('formatSatoshi', formatSatoshi);

    Handlebars.registerHelper('getTotal', function (utxoSet) {
        return formatSatoshi(utxoSet.totalAmount);
    });

    ui.btnScan.click(function () {
        ui.lblRootKeyInfoError.text('').addClass('hidden');
        ui.lblRootKeyInfo.text('');

        const masterseed = ui.txRootNode.val();
        if (_.isEmpty(masterseed)) {
            ui.lblRootKeyInfoError.text('Error: Enter the masterseed or the xPriv/xPub of the root node').removeClass('hidden');
        } else {
            try {
                scanner = new Masterscan(masterseed, cfg.network);
                ui.lblRootKeyInfo.text(scanner.rootnode);
                scanner.scan()
                    .then(accounts => {
                        lastResult = accounts;
                        updateAccountList(accounts);
                        updateTransaction(accounts);
                    });
            } catch (e) {
                ui.lblRootKeyInfoError.text('Error: ' + e.message).removeClass('hidden');
            }
        }
    });

    ui.btnUpdateTransaction.click(()=> {
        if (lastResult) updateTransaction(lastResult);
    });

    ui.btnSendTransaction.click(() => {
        if (lastTransaction) {
            Masterscan.broadcastTx(lastTransaction)
                .then(d => {
                    console.log(d);
                    if (d.err){
                        toastr.error("Broadcast failed: " + d.err, "Unable to send");
                    } else {
                        toastr.success("Transaction broadcast!<br>Transaction id: " + Handlebars.escapeExpression(d.txid), 'Sending...');
                    }
                });
        }
    });

    function updateAccountList(accounts) {
        const utxos = accounts[0].getUtxo();

        ui.divAccounts.html(tmpl.accounts(accounts));
        ui.divUtxos.html(tmpl.utxos(utxos));
    }

    function updateTransaction(accounts) {
        const utxos = accounts[0].getUtxo();
        const keyBag = accounts[0].keyBag;
        const addr = ui.txReceiverAddress.val();
        const fee = ui.txFeePerByte.val();
        // todo validate
        scanner.prepareTx(utxos, keyBag, addr, fee).then(tx => {
            lastTransaction = tx;
            const rawTx = tx.toString();
            ui.txTransaction.val(rawTx);
            const totalFee = tx.getFee();
            const totalValue = tx.outputAmount;
            ui.spTotalFee.text(formatSatoshi(totalFee));
            ui.spPercentageFee.text(Math.round(totalFee / totalValue * 100) + "%");
            ui.spSendingAmount.text(formatSatoshi(totalValue));
            ui.spTxSize.text(tx.toBuffer().length + " Bytes");
            ui.aCheckTx.attr('href', "https://coinb.in/?verify=" + rawTx);
        })
    }

    Masterscan.fetchFee().then(d => ui.txFeePerByte.val(d));
});


class FakeTransaction{
    constructor(tx){
        this.tx = tx;
    }

    serialize(){
        return this.tx;
    }

    toString(){
        return this.tx;
    }
}