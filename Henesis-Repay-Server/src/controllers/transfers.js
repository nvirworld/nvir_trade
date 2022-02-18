const BigNumber = require('bignumber.js');

const http = require('../utils/http');

const history = require('../models/dw-history');
const balance = require('../models/balance');

const config = require('../config');

const process_transfers = ({ updatedAt, transactionHash, to, amount, depositAddressId = '', transferType, ticker }) => {
  const flush =
    !depositAddressId || //
    transferType === 'WITHDRAWAL' ||
    (transferType === 'DEPOSIT' && depositAddressId === process.env.MASTER_ID)
      ? 'Y'
      : 'N';

  // 정수는 최대 15자리까지만 정확하기 떄문에 해당 라이브러리를 이용해 계산
  const calculated_amount = new BigNumber(amount).multipliedBy(0.0000000001).toNumber().toLocaleString('fullwide', { useGrouping: false });

  return {
    block_number: updatedAt,
    transaction_hash: transactionHash,
    wallet_address: to,
    amount: calculated_amount,
    private_key: depositAddressId || '',
    flush,
    transfer_type: transferType,
    coin_code: ticker,
  };
};

/* 전체 지갑 목록 조회 및 DB 동기화 */
async function get_transfers_list() {
  const curr_timestamp = new Date().getTime();
  const last_timestamp = await history.get_last_timestamp();
  const list = [];
  let page_no = 0; // 헤네시스api에서 page는 1이 아닌 0부터 시작함

  // 1. 다음 페이지가 없을 때까지 입출금 내역 조회
  while (true) {
    const { pagination, results } = await http.get('/transfers', {
      params: {
        page: page_no,
        // updatedAt이 해당 시점보다 이전인 트랜잭션 조회 (형식: ms, UNIX time)
        updatedAtLt: curr_timestamp,
        // updatedAt이 해당 시점과 같거나 그보다 이후인 트랜잭션 조회(형식: ms, UNIX time)
        // 1을 더해주어야 DB에 들어있는 데이터와의 중복이 발생하지 않는다.
        ...(last_timestamp > 0 && { updatedAtGte: last_timestamp + 1 }),
      },
    });
    list.push(...results);
    page_no++;
    if (!pagination?.nextUrl) break;
  }

  console.log(`[${last_timestamp} ~ ${curr_timestamp}] new transfers count: ${list.length}`);

  // 2. DB 입출금 내역에 데이터 쌓아 주기
  // api는 최신순으로 조회하기 때문에 마지막에 역순 정렬을 해주어야한다.
  const transfers_list = [...list].reverse().map(process_transfers);
  if (transfers_list.length > 0) await history.add_histories(transfers_list);

  return true;
}

/* 집금 처리 및 DB 동기화 */
async function flush_money() {
  const not_flushed = await history.get_not_flushed();
  if (not_flushed.length < 50) {
    console.log(`not enough not_flushed: ${not_flushed.length} keys`);
    return true;
  }

  // 1. 집금 API 요청
  const request_targets = not_flushed.map((el) => {
    const idMap = config.inst().coins;
    return {
      coinId: idMap[el['COIN_CODE']]['id'],
      depositAddressId: el['PRIVATE_KEY'],
    };
  });

  await http.post('/wallets/flush', { targets: request_targets }).catch((e) => {
    console.log(e);
    // 모든 데이터가 기존에 집금된 상태였을 경우 에러 처리하지 않음.
    // (이미 henesis에 데이터가 쌓여있는 상태인 경우 해당 케이스가 발생할 수 있음)
    if (e.message.startsWith('all targets') && e.code === 4000) return true;
    throw e;
  });

  console.log('henesis flush api success');

  // 2. DB 집금 처리
  for (const el of not_flushed) {
    await history.update_flush({
      private_key: el['PRIVATE_KEY'],
      coin_code: el['COIN_CODE'],
      state: 'Y',
    });
  }

  console.log(`TP_DW_HISTORY - database updated`);

  // 3. DB 잔고 업데이트
  for (const el of not_flushed) {
    await balance.update_balance({
      private_key: el['PRIVATE_KEY'],
      coin_code: el['COIN_CODE'],
      amount: el['AMOUNT_SUM'],
      state: 'PLUS',
    });
  }

  console.log('TP_USER_BALANCE - database updated');

  return true;
}

/* 500ms 간격으로 스케줄링 */
async function poll() {
  console.log('polling start');
  try {
    await get_transfers_list();
    await flush_money();
    console.log('polling end');
  } catch (e) {
    if (e.code && e.code >= 4000) console.log(e);
    else throw e;
  } finally {
    setTimeout(() => {
      poll();
    }, 5000);
  }
}

exports.poll = poll;
