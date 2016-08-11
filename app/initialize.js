'use strict';


const Handlebars = require('handlebars');
const jQuery = require('jquery');
const $ = jQuery;
window.$ = window.jQuery = jQuery;  // workaround for browserify

const _ = require('lodash');

// Bootstrap
const bootstrap = require('bootstrap');
const style = require('../node_modules/bootstrap/dist/css/bootstrap.css')
require('bootstrap');



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
    network : bitcore.Networks.testnet
    //network : bitcore.Networks.livenet
};

var scanner = null;

document.addEventListener('DOMContentLoaded', function() {
    const ui = {
        txRootNode : $('#txRootNode'),
        txReceiverAddress : $('#txReceiverAddress'),
        txTransaction : $('#txTransaction'),
        btnScan : $('#btnScan'),
        lblRootKeyInfo : $('#lblRootKeyInfo'),
        lblRootKeyInfoError : $('#lblRootKeyInfoError'),
        divAccounts : $('#accounts'),
        divUtxos : $('#utxos'),
    };

    const tmpl = {
        accounts : Handlebars.compile($("#accounts-template").html()),
        utxos : Handlebars.compile($("#utxos-template").html()),
        addresslist : Handlebars.compile($("#addresslist-template").html()),
    }

    Handlebars.registerPartial('addresses', tmpl.addresslist);

    Handlebars.registerHelper('txLink', function(txid) {
        return "http://tbtc.blockr.io/tx/info/" + txid;
    });

    const formatSatoshi=function(sats) {
        return sats / 100000000 + " BTC";
    };

    Handlebars.registerHelper('formatSatoshi', formatSatoshi);

    Handlebars.registerHelper('getTotal', function(utxoSet) {
        return formatSatoshi(utxoSet.totalAmount);
    });

    ui.btnScan.click(function(){
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
                        const utxos = accounts[0].getUtxo();
                        const keyBag = accounts[0].keyBag;

                        ui.divAccounts.html(tmpl.accounts(accounts));
                        ui.divUtxos.html(tmpl.utxos(utxos));
                        const addr = ui.txReceiverAddress.val();
                        // todo validate
                        scanner.prepareTx(utxos, keyBag, addr, 50).then(d => {
                            ui.txTransaction.val(d.toString());
                        })
                });
            } catch (e) {
                ui.lblRootKeyInfoError.text('Error: ' + e.message).removeClass('hidden');
            }
        }


    })
});
