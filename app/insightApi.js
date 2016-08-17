'use strict';

require('whatwg-fetch');
const bitcore = require('bitcore-lib');
const Transaction = bitcore.Transaction;
const _ = require('lodash');
const INSIGHT_ENDPOINT = 'api';

class Insight {
    constructor(host){
        this.host = host;
    }

    isAddressUsed(address) {
        const endpoint = `/addr/${address}?noTxList=1`;
        return this.unwrapJson(fetch(this.sanitizeURL(endpoint)));
    }

    getUTXOs(addresses) {
        const endpoint = '/addrs/utxo';
        return this.unwrapJson(fetch(this.sanitizeURL(endpoint), {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                addrs: addresses.join(','),
            }),
        }));
    }


    sendTransaction(tx) {
        const endpoint = `/tx/send`;
        return this.unwrapJson(fetch(this.sanitizeURL(endpoint), {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rawtx: tx.serialize(),
            }),
        }));

    }

    unwrapJson(response){
        return response.then(d => {
            if (d.ok) {
                return d.json();
            } else {
                // we got a non-json error response
                return d.text().then(txt => {
                    throw new Error (txt);
                });
            }
        });
    }

    getFeeEstimate(nblocks) {
        const endpoint = `/utils/estimatefee?nbBlocks=${nblocks}`;
        return this.unwrapJson(fetch(this.sanitizeURL(endpoint)));
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
