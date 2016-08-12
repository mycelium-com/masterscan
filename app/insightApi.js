// @flow

'use strict';

const bitcore = require('bitcore-lib');
const {Transaction} = bitcore;
const _ = require('lodash');
// const INSIGHT_ENDPOINT = 'insight-api';
const INSIGHT_ENDPOINT = 'api';
// const DEFAULT_HOST = 'insight-testnet.mycelium.com';
const DEFAULT_HOST = 'test-insight.bitpay.com';

class Insight {
    constructor(host = DEFAULT_HOST){
        this.host = host;
    }

    isAddressUsed(address) {
        const endpoint = `/addr/${address}?noTxList=1`;
        return fetch(this.sanitizeURL(endpoint))
            .then(d => d.json());
    }

    getUTXOs(addresses) {
        const endpoint = '/addrs/utxo';
        return fetch(this.sanitizeURL(endpoint), {
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


    sendTransaction(tx) {
        const endpoint = `/tx/send`;
        return fetch(this.sanitizeURL(endpoint), {
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

    getFeeEstimate(nblocks) {
        const endpoint = `/utils/estimatefee?nbBlocks=${nblocks}`;
        return fetch(this.sanitizeURL(endpoint)).then(d => d.json());
    }

    sanitizeURL(url) {
        url = `${this.host}/${INSIGHT_ENDPOINT}` + url;
        let ret = url.replace(/\s/g, '');
        if (!ret.startsWith('http://') && !ret.startsWith('https://')) {
            ret = `https://${ret}`;
        }
        return ret;
    }
}

module.exports = Insight;
