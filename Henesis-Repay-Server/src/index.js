'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const JsonRpc = require('@koalex/koa-json-rpc');

const http = {
  http: require('http'),
  https: require('https'),
};
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const config = require('./config');

const methods = require('./methods');
const get_henesis_response = require('./controllers');
const { poll } = require('./controllers/transfers');

const app = new Koa();
const router = new Router();

const jsonrpc = new JsonRpc({
  bodyParser: bodyParser({
    onerror(e, ctx) {
      ctx.status = 200;
      ctx.body = JsonRpc.parseError;
    },
  }),
});

// 기존 소스의 '/api'경로는 이미 사용중인 다른 경로와 중복되기 때문에 아래와 같이 '/funnyfig_api'로 경로를 변경
router.post('/funnyfig_api', jsonrpc.middleware);
router.get('/ping', (ctx, next) => {
  ctx.body = 'pong';
  next();
});

app.use(router.routes());
app.use(router.allowedMethods());

function setup_jsonrpc_methods() {
  const state = {};

  for (const m of Object.keys(methods)) {
    const method = methods[m];

    jsonrpc.method(m, async (ctx, next) => {
      try {
        console.log(`${m} called`);

        // convert JSONRPC request to backend server request
        const req = method.req(state, ctx.jsonrpc.params);

        // exchange packets with the server
        // just echo in this sample
        const backend_resp = await get_henesis_response(m, req);

        // convert backend sever response to  JSONRPC response
        const resp = method.resp(state, backend_resp);

        ctx.body = resp || 0;
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        // do something common
        await next();
      }
    });
  }
}

const _create_server = {
  http: () => {
    return http['http'].createServer(app.callback());
  },
  https: () => {
    const { key, cert } = config.inst().frontend;

    const k = fs.readFileSync(path.resolve(process.cwd(), key)).toString();
    const c = fs.readFileSync(path.resolve(process.cwd(), cert)).toString();

    return http['https'].createServer(
      {
        key: k,
        cert: c,
      },
      app.callback()
    );
  },
};

function create_server() {
  return _create_server[config.inst().frontend.protocol]();
}

async function main() {
  //
  // initialize
  //
  // such as connecting to the backends...
  setup_jsonrpc_methods();

  const server = create_server();

  const { port, host } = config.inst().frontend;

  server.listen(port, host);
  console.log(`server listening on port ${port}`);
}

main()
  .then(() => poll())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
