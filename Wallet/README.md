# Wallet Interface
This project shows how to integrate [Metamask](https://docs.metamask.io/guide/) boowser extension and [WalletConnect](https://docs.walletconnect.org/) into the common interface.

## Build
Install dependencies:
```$ yarn```
Lerna bootstrap:
```$ yarn bootstrap```
Compile:
```$ yarn build```

## Usage
see packages/wallet/src/index.{html,js}

```$ cd packages/wallet && python3 -m 'http:server'```
```$ firefox localhost:8000/dist
