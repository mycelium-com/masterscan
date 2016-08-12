// @flow

'use strict';

const bitcore = require('bitcore-lib');
const {Transaction} = bitcore;
const _ = require('lodash');


function isAddressUsed(address, host = DEFAULT_HOST) {
    const endpoint = `${host}/
    ${INSIGHT_ENDPOINT}/
    addr/
    ${address}?noTxList=1`;
    return fetch(sanitizeURL(endpoint))
        .then(d => d.json());
}

function getUTXOs(addresses, host = DEFAULT_HOST) {
    const endpoint = `${host}/
    ${INSIGHT_ENDPOINT}/
    addrs/utxo`;
    return fetch(sanitizeURL(endpoint), {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            addrs: addresses.join(','),
        }),
    }).then(function (d) {
        return d.json();
    });
}


function sendTransaction(tx, host = DEFAULT_HOST) {
    const endpoint = `${host}/
    ${INSIGHT_ENDPOINT}/
    tx/send`;
    return fetch(sanitizeURL(endpoint), {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            rawtx: tx.serialize(),
        }),
    })
        .then(d => {
            if (d.ok) {
                return d.json();
            } else {
                // we got a non-json error response
                return d.text().then(txt => {
                    return {txid: null, err: txt};
                });
            }
        })
        .catch(err => {
            return {txid: null, err: err};
        });
}

/*
 function getTransactionInfo(txId, host = DEFAULT_HOST){
 const endpoint = `${host}/
 ${INSIGHT_ENDPOINT}/
 tx/
 ${txId}`;
 const response = fetch(sanitizeURL(endpoint));
 return response.json();
 }

 function getBlockHeight(host = DEFAULT_HOST) {
 const endpoint = `${host}/
 ${INSIGHT_ENDPOINT}/
 sync`;
 const response = fetch(sanitizeURL(endpoint));
 const json = response.json();
 return json.height;
 }

 function getTransactions(addresses, start, end, host = DEFAULT_HOST) {
 const endpoint = `${host}/
 ${INSIGHT_ENDPOINT}/
 addrs/txs?from=${start}&to=${end}`;
 return fetch(sanitizeURL(endpoint), {
 method: 'POST',
 headers: {
 'Accept': 'application/json',
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 addrs: addresses.join(','),
 from: start,
 to: end,
 }),
 }).then(d => d.json());
 }

 */

function getFeeEstimate(nblocks, host = DEFAULT_HOST) {
    const endpoint = `${host}/
    ${INSIGHT_ENDPOINT}/
    utils/estimatefee?nbBlocks=${nblocks}`;
    return fetch(sanitizeURL(endpoint)).then(d => d.json());
}

function sanitizeURL(url) {
    let ret = url.replace(/\s/g, '');
    if (!ret.startsWith('http://') && !ret.startsWith('https://')) {
        ret = `https://${ret}`;
    }
    return ret;
}

// const INSIGHT_ENDPOINT = 'insight-api';
const INSIGHT_ENDPOINT = 'api';
// const DEFAULT_HOST = 'insight-testnet.mycelium.com';
const DEFAULT_HOST = 'test-insight.bitpay.com';

const InsightAPI = {
    DEFAULT_HOST,
    INSIGHT_ENDPOINT,
    isAddressUsed,
    getUTXOs,
    getTransactions,
    getTransactionInfo,
    sendTransaction,
    getBlockHeight,
    getFeeEstimate,
}

module.exports = InsightAPI;
