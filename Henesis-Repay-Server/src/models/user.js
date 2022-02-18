const pool = require('../utils/pool');
const config = require('../config');

class User {
  async find_by_id(id) {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(`SELECT * FROM TP_USER_INFO where USER_ID = ?`, [id]);
    conn.release();
    return rows;
  }

  async find_by_address(address) {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(`SELECT * FROM TP_USER_INFO where WALLET_ADDRESS = ?`, [address]);
    conn.release();
    return rows;
  }

  async add_user({ id, address, private_key }) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query('INSERT INTO TP_USER_INFO SET ?', {
        USER_ID: id,
        WALLET_ADDRESS: address,
        PRIVATE_KEY: private_key,
      });
      // 유저 정보 추가시, 잔고 테이블에도 해당 유저 정보를 추가(코인 코드별로)
      for (const coin_code of Object.keys(config.inst().coins)) {
        await conn.query('INSERT INTO TP_USER_BALANCE SET ?', {
          USER_ID: id,
          COIN_CODE: coin_code,
        });
      }
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

module.exports = new User();
