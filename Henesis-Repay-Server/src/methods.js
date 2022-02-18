'use strict';

module.exports = {
  api1: {
    req: (state, req) => {
      return req;
    },
    resp: (state, resp) => {
      return resp;
    },
  },

  api2: {
    req: (state, req) => {
      return req;
    },
    resp: (state, resp) => {
      return resp;
    },
  },

  account: {
    req: (state, req) => ({
      ...req,
      create: req.create === 'true',
    }),
    resp: (state, resp) => {
      return resp;
    },
  },

  transactionHistory: {
    req: (state, req) => {
      const date_to_timestamp = (date) => {
        const parsed = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
        return new Date(parsed).getTime();
      };

      return {
        ...req,
        begin: date_to_timestamp(req.begin),
        end: date_to_timestamp(req.end),
        coin_code: req.coin_code || 'NVIR',
      };
    },
    resp: (state, resp) => {
      return resp;
    },
  },
};
