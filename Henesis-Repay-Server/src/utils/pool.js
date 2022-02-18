const mysql = require('mysql2');

// pool 객체 옵션 이후 수정 필요
// async/await를 가능하게 하기 위해 promise method를 사용함
const pool = mysql
  .createPool({
    host: process.env.DB_HOSTNAME || 'localhost',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  .promise();

module.exports = pool;
