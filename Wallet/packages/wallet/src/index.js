import EventEmitter from 'events';
import { default as create_metamask, metamask_deep_link} from '@nvirworld/metamask';
import {isMobile} from '@walletconnect/browser-utils';
import {WalletState} from '@nvirworld/wallet_common';

class State extends WalletState {
	constructor(emitter, state)
	{
		super(emitter, state);
	}

	async sign(msg)
	{
		throw new Error(`Invalid method for ${this.emitter.wallet_type}.${this.state}`);
	}
}

class Unavailable extends State {
	constructor(emitter)
	{
		super(emitter, 'unavailable');
	}

	async connect()
	{
		return this.emitter.wallet.connect();
	}
}

class Available extends State {
	constructor(emitter)
	{
		super(emitter, 'available');
	}

	async disconnect()
	{
		return this.emitter.wallet.disconnect();
	}

	async personal_sign(msg)
	{
		const {wallet, accounts} = this.emitter;
		return await wallet.personal_sign(accounts[0], msg);
	}
}

function change_state(state, ...args)
{
	const inst = Wallet.inst;

	if (inst.state === inst.states[state])
		return;

	inst.state = inst.states[state];
	inst.state.enter(...args);
}

class Wallet extends EventEmitter {
	constructor({bridge})
	{
		super();

		this.bridge = bridge;

		if (process.env.NODE_ENV !== 'production') {
			this.reset = () => {
				localStorage.removeItem(Wallet._CUR_WALLET);
			};
		}
	}

	async start()
	{
		this.states = {
			UNAVAIL: new Unavailable(this),
			AVAIL: new Available(this)
		}

		const type = this.type || 'metamask';

		if (this.type) {
			change_state('UNAVAIL');
			await this.select_wallet(type);
		}
		else {
			await this.select_wallet(type);
			change_state('UNAVAIL');
		}

	}

	get type()
	{
		if (!this.wallet_type) {
			this.wallet_type = localStorage.getItem(Wallet._CUR_WALLET);
		}
		return this.wallet_type;
	}

	async select_wallet(wallet_type)
	{
		console.log('select_wallet', wallet_type);

		if (!['metamask', 'walletconnect'].includes(wallet_type)) {
			throw new Error(`Invalid wallet type: ${wallet_type}`);
		}

		if (this.wallet) {
			if (this.wallet.wallet_type === wallet_type) return;
			this.wallet.stop();
		}

		const w = (wallet_type === 'metamask')
			? create_metamask()
			: (await import('@nvirworld/walletconnect')).default({bridge: this.bridge});

		w.on('connect', (w, accounts) => {
			this.accounts = accounts;
			change_state('AVAIL', accounts);
		});

		w.on('disconnect', (w) => {
			delete this.accounts;
			change_state('UNAVAIL');
		});

		this.wallet = w;
		console.log('select_wallet', this.wallet);
		this.wallet_type = wallet_type;
		localStorage.setItem(Wallet._CUR_WALLET, wallet_type);

		await w.start();
	}

	// Metamask
	install()
	{
		this.state.install();
	}

	// Metamask, WalletConnect
	async connect()
	{
		return this.state.connect();
	}

	// WalletConnect
	async disconnect()
	{
		return this.state.disconnect();
	}

	async personal_sign(msg)
	{
		return this.state.personal_sign(msg);
	}

	get mobile()
	{
		return isMobile();
	}

	metamask_deep_link()
	{
		return metamask_deep_link();
	}
}

Wallet._CUR_WALLET = 'selected_wallet';

export default (opt) => {
	if (!Wallet.inst) {
		opt = opt || {}
		Wallet.inst = new Wallet(opt);
	}

	return Wallet.inst;
};
