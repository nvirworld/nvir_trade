const history = require('../models/dw-history');
const { timestamp_to_date } = require('../utils/common');

exports.get_transaction_history = async function ({ user_id, begin, end, coin_code }) {
  const rows = await history.get_history_of_user({ user_id, begin, end, coin_code });

  return rows.map((el) => [
    timestamp_to_date(el['BLOCK_NUMBER']), //
    el['BLOCK_NUMBER'].toString(),
    el['COIN_CODE'],
    el['AMOUNT'],
    el['TRANSFER_TYPE'] === 'DEPOSIT' ? '입금' : '출금',
  ]);
};
