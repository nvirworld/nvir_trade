const axios = require('axios');

const config = require('../config');

/*
 * # 헤네시스 서버에 http api 요청할때 기본으로 사용하는 instance
 * ## docs
 * - 한국어 번역: https://yamoo9.github.io/axios/
 * - github: https://github.com/axios/axios
 *
 * ## 사용법
 * - 아래 http default setting에서 자동으로 처리하는 부분들
 * - `/wallets/{walletId}/xyz`꼴의 url은 `/wallets/xyz` 형식으로 기입하면 됨.
 * - get요청시 query string에 포함되는 walletId는 굳이 넣어주지 않아도 됨.
 */
const http = axios.create({
  baseURL: `${config.inst().frontend.protocol}://${process.env.HOSTNAME}:${process.env.PORT}/api/v3/ethereum`,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Henesis-Secret': process.env.API_SECRET,
    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
  },
});

/* http default setting */
(() => {
  // 1. request 전처리. 이후 서버로 요청 전송됨.
  http.interceptors.request.use((config) => {
    // wallets 관련 요청의 경우 url에 walletId를 추가해준다
    // 예외) wallets > 전체 지갑 목록 조회하기
    if (/^\/wallets\/\S+/.test(config.url)) {
      const { url } = config;
      let i = 0;
      while (++i < url.length) if (url[i] === '/') break;
      config.url = `/wallets/${process.env.MASTER_ID}/${url.slice(i + 1)}`;
    }
    return config;
  });

  // 2. response 전처리. 이후 then/catch로 response 전달됨.
  http.interceptors.response.use(
    (res) => Promise.resolve(res.data),
    (err) => Promise.reject(err.response.data)
  );
})();

module.exports = http;
