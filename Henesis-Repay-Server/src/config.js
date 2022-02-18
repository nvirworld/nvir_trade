'use strict';

const path = require('path');
const fs = require('fs');

// TODO: make properties ro
class config_t {
  constructor(conf) {
    Object.assign(this, conf);
  }
}

const config = {
  inst() {
    if (!this._inst) {
      const conf_path = path.join(process.cwd(), 'config.json');
      let conf = fs.readFileSync(conf_path);
      conf = JSON.parse(conf);
      this._inst = new config_t(conf);
    }

    return this._inst;
  },
};

module.exports = config;
