const http = require('../utils/http');

const user = require('../models/user');

exports.issue_wallet = async function (user_id) {
  const [res] = await user.find_by_id(user_id);
  if (res) return { address: res.WALLET_ADDRESS };

  const post_res = await http.post('/wallets/deposit-addresses', {
    name: user_id,
  });

  await user.add_user({
    id: user_id,
    address: post_res.address,
    private_key: post_res.id,
  });

  return { address: post_res.address };
};

exports.get_wallet_address = async function (id) {
  const [res] = await user.find_by_id(id);

  return { address: res ? res.WALLET_ADDRESS : '' };
};
