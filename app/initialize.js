'use strict';


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
};

document.addEventListener('DOMContentLoaded', function() {
    const ui = {
        txRootNode : $('#txRootNode'),
        btnScan : $('#btnScan'),
        lblRootKeyInfo : $('#lblRootKeyInfo'),
        lblRootKeyInfoError : $('#lblRootKeyInfoError'),
    };


    ui.btnScan.click(function(){
        ui.lblRootKeyInfoError.text('').addClass('hidden');
        ui.lblRootKeyInfo.text('');

        const masterseed = ui.txRootNode.val();

        try {
            const scanner = new Masterscan(masterseed, cfg.network);
            ui.lblRootKeyInfo.text(scanner.rootnode);
        } catch (e){
            ui.lblRootKeyInfoError.text('Error: ' + e.message).removeClass('hidden');
        }


    })
});
