# Masterscan

A web tool to scan multiple Bitcoin accounts for funds and send them to a new account.
You can provide a [BIP39 wordlist](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) or
a [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) serialized private or public key.

The tool scans for following accounts:
* The root account (`m/k`)
* The BitcoinCore (>V0.13.0) account (`m/0'/0'/k'`)
* The [BIP44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) HD accounts (`m/44'/0'/acc'/{0/1}/k`)

It has a bit more relaxed gap settings than the original definition (5 for change chain and 25 for external chain)

It uses [insight.is](https://insight.is/) to fetch address balances and the UTXO set.


## Local development or hwo to run it locally
* Install (if you don't have them):
    * [Node.js](http://nodejs.org): `brew install node` on OS X
    * Bower and [Brunch](http://brunch.io): `npm install -g bower brunch`
    * Brunch plugins and app dependencies: `brunch build`
* Run:
    * `brunch watch --server` — watches the project with continuous rebuild. This will also launch HTTP server with [pushState](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history).
    * `brunch build --production` — builds minified project for production
* Development:
    * `public/` dir is fully auto-generated and served by HTTP server.  Write your code in `app/` dir.
    * Place static files you want to be copied from `app/assets/` to `public/`.
    * [Brunch site](http://brunch.io), [Getting started guide](https://github.com/brunch/brunch-guide#readme)


## How to use it

If you use it with a masterseed with funds on it, you need to ensure the computer
you use is safe (no keylogger, trojan, ...). It needs to be able to fetch data from an external
server to scan for funds, so you cant run it offline.

Either build it yourself and run it locally to prevent any chance of tampering or run the
live version here [https://mycelium-com.github.io/masterscan/](https://mycelium-com.github.io/masterscan/)

It is advised to not reuse a masterseed afterwards, if you entered it on a internet connected device.

## License

This tool is [MIT-licensed](LICENSE.txt).