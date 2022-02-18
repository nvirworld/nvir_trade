'use strict';

const wallets = require('./wallets');
const tr_history = require('./transaction-history');

/*
 * @params {string} method
 * @params {object} req
 * @return {Promise}
 * */
module.exports = (method, req) => {
  // to be added
  const method_map = {
    account: () => (req.create ? wallets.issue_wallet(req.user_id) : wallets.get_wallet_address(req.user_id)),
    transfer: () => {},
    transactionHistory: () => tr_history.get_transaction_history(req),
  };

  return method_map[method]();
};
