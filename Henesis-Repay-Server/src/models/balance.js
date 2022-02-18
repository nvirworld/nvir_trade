const pool = require('../utils/pool');
const mysql = require('mysql2');

class Balance {
  async update_balance({ private_key, coin_code = 'NVIR', amount, state = 'PLUS' }) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    const update_query = `
       UPDATE TP_USER_BALANCE
       SET BAL_AMT = BAL_AMT ${state === 'PLUS' ? '+' : '-'} ${mysql.escape(amount)}
       WHERE USER_ID = (
             SELECT USER_ID
             FROM TP_USER_INFO
             WHERE PRIVATE_KEY = ${mysql.escape(private_key)}
         ) AND COIN_CODE = ${mysql.escape(coin_code)}
    `;

    try {
      await conn.query(update_query);
      await conn.commit();
    } catch (e) {
      console.log(e);
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}

module.exports = new Balance();
