import EventEmitter from 'events';
import { convertUtf8ToHex } from '@walletconnect/utils';
import {WalletState} from '@nvirworld/wallet_common';

class Disconnected extends WalletState {
	constructor(emitter)
	{
		super(emitter, 'disconnect');
	}

	async connect()
	{
		await new Promise((resolve) => {
			const poll_disconnect = async () => {
				await this.emitter.create_connector();
				if (this.emitter.connector.connected) {
					console.log('Disconnected but connected :(');
					setTimeout(poll_disconnect, 500);
				}
				else {
					resolve();
				}
			};
			poll_disconnect();
		});

		// unexpectedly never throw exception (reject);
		// see below workaround: modal_closed
		try {
			const rv = await this.emitter.connector.createSession();
			console.dir(rv);
		}
		catch (e) {
			console.error(e);
			throw e;
		}
	}
}

class Connected extends WalletState {
	constructor(emitter)
	{
		super(emitter, 'connect');
	}

	async disconnect()
	{
		const {connector} = this.emitter;

		if (!connector.connected) {
			console.log('Already disconnected!');
			return;
		}

		// 'disconnect' triggered from connector
		await connector.killSession();

		console.log('disconnect()', connector.connected);
	}

	async connect()
	{
		const {accounts, chainId} = this.emitter.connector;
		this.emitter.change_state('CONN', accounts, chainId);
	}

	async personal_sign(account, msg)
	{
		const {connector} = this.emitter;

		if (!connector.connected) {
			console.warn('Already disconnected!');
			return;
		}

		const rv = await connector.signPersonalMessage([
			convertUtf8ToHex(msg),
			account
		]);
		return rv;
	}
}

class Session extends EventEmitter {
	constructor({bridge})
	{
		super();

		this.wallet_type = 'wallectconnect';

		this.bridge = bridge || 'https://bridge.walletconnect.org';

		this.state = new WalletState(this, 'init');
	}

	async start()
	{
		this.states = {
			NCONN: new Disconnected(this),
			CONN: new Connected(this)
		};

		await this.create_connector();

		let state_args;
		if (this.connector.connected) {
			const { accounts, chainId } = this.connector;
			state_args = ['CONN', accounts, chainId];
		}
		else {
			state_args = ['NCONN'];
		}
		this.change_state(...state_args);
	}

	stop()
	{
	}

	async create_connector()
	{
		const [WalletConnect, QRCodeModal] = await Promise.all([
			import('@walletconnect/client'),
			import('@walletconnect/qrcode-modal')
		]);

		const connector = new WalletConnect.default({
			bridge: this.bridge,
			qrcodeModal: QRCodeModal
		});

		// workaround: createSession doesn't reject when QR code dialog closed
		connector.on('modal_closed', () => {
			this.change_state('NCONN');
		});

		connector.on('connect', (e, payload) => {
			if (e) throw e;
			const {accounts, chainId} = payload.params[0];

			this.change_state('CONN', accounts, chainId);
		});
		connector.on('disconnect', (e, payload) => {
			if (e) throw e;

			this.change_state('NCONN');
		});
		connector.on('session_update', (e, payload) => {
			if (e) throw e;

			const {accounts, chainId} = payload.params[0];

			this.change_state('NCONN');
			this.change_state('CONN', accounts, chainId);
		});

		this.connector = connector;
	}

	change_state(state, ...args)
	{
		this.state = this.states[state];
		this.state.enter(...args);
	}

	async connect()
	{
		return this.state.connect();
	}

	async disconnect()
	{
		return this.state.disconnect();
	}

	async personal_sign(account, msg)
	{
		return this.state.personal_sign(account, msg);
	}
}

export default (opt) => {
	opt = opt || {};
	return new Session(opt);
}
