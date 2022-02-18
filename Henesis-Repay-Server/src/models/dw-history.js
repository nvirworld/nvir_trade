const pool = require('../utils/pool');
const mysql = require('mysql2');

class History {
  async get_last_timestamp() {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(`
        SELECT MAX(BLOCK_NUMBER) as 'LAST_TIMESTAMP'
        FROM TP_DW_HISTORY;
    `);
    conn.release();
    return rows[0]['LAST_TIMESTAMP'] || 0;
  }

  async add_history({ block_number, transaction_hash, wallet_address, amount, private_key, flush }) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      await conn.query(`INSERT INTO TP_DW_HISTORY SET ?`, {
        BLOCK_NUMBER: block_number,
        TRANSACTION_HASH: transaction_hash,
        WALLET_ADDRESS: wallet_address,
        AMOUNT: amount,
        PRIVATE_KEY: private_key,
        FLUSH: flush,
      });
      await conn.commit();
    } catch (e) {
      console.log(e);
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async add_histories(transfer_arr) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    // multiple insert 위해 2차원 배열 생성
    const rows = transfer_arr.map((el) => [el.block_number, el.transaction_hash, el.wallet_address, el.amount, el.private_key, el.flush, el.transfer_type, el.coin_code]);
    try {
      await conn.query(
        `INSERT INTO TP_DW_HISTORY
        (BLOCK_NUMBER, TRANSACTION_HASH, WALLET_ADDRESS, AMOUNT, PRIVATE_KEY, FLUSH, TRANSFER_TYPE, COIN_CODE)
        VALUES ?`,
        [rows]
      );
      await conn.commit();
    } catch (e) {
      console.log(e);
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async get_not_flushed() {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(`
      SELECT A.PRIVATE_KEY, A.COIN_CODE, A.AMOUNT_SUM
      FROM (
             SELECT PRIVATE_KEY, COIN_CODE, SEQ, SUM(AMOUNT) as 'AMOUNT_SUM'
             FROM TP_DW_HISTORY
             WHERE FLUSH = 'N' AND PRIVATE_KEY != ''
             GROUP BY PRIVATE_KEY, COIN_CODE
           ) A
      ORDER BY A.SEQ DESC LIMIT 50;
    `);
    conn.release();
    return rows;
  }

  async update_flush({ private_key, coin_code = 'NVIR', state = 'Y' }) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    const update_query = `
      UPDATE TP_DW_HISTORY
      SET FLUSH = ${mysql.escape(state)}
      WHERE PRIVATE_KEY = ${mysql.escape(private_key)}
          and COIN_CODE = ${mysql.escape(coin_code)};
    `;

    try {
      const [res] = await conn.query(update_query);
      await conn.commit();
      return res.affectedRows;
    } catch (e) {
      console.log(e);
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async get_history_of_user({ user_id, begin = 0, end = new Date().getTime(), coin_code = 'NVIR' }) {
    const conn = await pool.getConnection();

    const select_query = `
      SELECT *
      FROM TP_DW_HISTORY
      WHERE PRIVATE_KEY = (
          SELECT PRIVATE_KEY
          FROM TP_USER_INFO
          WHERE USER_ID = ${mysql.escape(user_id)})
        AND BLOCK_NUMBER >= ${mysql.escape(begin)}
        AND BLOCK_NUMBER <= ${mysql.escape(end)}
        AND COIN_CODE = ${mysql.escape(coin_code)};
    `;

    const [res] = await conn.query(select_query);
    conn.release();
    return res;
  }
}

module.exports = new History();
