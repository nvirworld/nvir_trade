import EventEmitter from 'events';
import MetaMaskOnboarding from '@metamask/onboarding';

import {WalletState} from '@nvirworld/wallet_common';

class MetamaskState extends WalletState {
	constructor(emitter, state)
	{
		super(emitter, state);
	}

	leave()
	{
	}
}

class NotInstalled extends MetamaskState {
	constructor(emitter)
	{
		super(emitter, 'not_install');
	}

	async connect()
	{
		// install
		this.emitter.onboarding.startOnboarding();
	}
}

class Disconnected extends MetamaskState {
	constructor(emitter)
	{
		super(emitter, 'disconnect');
		this.notify = accounts => this._notify_new_accounts();
	}

	enter()
	{
		ethereum.on('accountsChanged', this.notify);
		super.enter();
	}

	leave()
	{
		ethereum.removeListener('accountsChanged', this.notify);
	}

	async connect()
	{
		if (ethereum.selectedAddress) {
			this.emitter.change_state('CONN', [ethereum.selectedAddress]);
			return;
		}

		const accounts = await ethereum.request({
			method: 'eth_requestAccounts'
		});
	}

	_notify_new_accounts(accounts)
	{
		if (!accounts || !accounts[0]) return;

		this.emitter.change_state('CONN', accounts);
	}
}

class DisconnectedInitial extends Disconnected {
	constructor(emitter)
	{
		super(emitter);
		this.poll_connected = () => this._poll_connected();
	}

	enter()
	{
		this.next_poll = 50;
		this.timer = setTimeout(this.poll_connected, 0);
		super.enter();
	}

	leave()
	{
		super.leave();
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = 0;
		}
	}

	_poll_connected()
	{
		console.log('polling');
		if (!ethereum.selectedAddress) {
			if (this.next_poll < 1000) {
				this.next_poll = Math.min(1000, Math.abs(this.next_poll * 1.5));
			}
			this.timer = setTimeout(this.poll_connected, this.next_poll);
			return;
		}
		this.timer = 0;
		this._notify_new_accounts([ethereum.selectedAddress]);
	}
}


class Connected extends MetamaskState {
	constructor(emitter)
	{
		super(emitter, 'connect');
		this.notify = accounts => this._notify_new_accounts();
	}

	async personal_sign(account, msg)
	{
		return ethereum.request({
			method: 'personal_sign',
			params: [account, msg]
		});
	}

	enter(...args)
	{
		this.emitter.onboarding.stopOnboarding();

		ethereum.on('accountsChanged', this.notify);

		super.enter(...args);
	}

	leave()
	{
		ethereum.removeListener('accountsChanged', this.notify);
	}

	_notify_new_accounts(accounts)
	{
		console.log('notified!!!!');

		if (!accounts || !accounts[0]) {
			return this.emitter.change_state('NCONN');
		}

		this.emitter.change_state('CONN', accounts);
	}

	connect()
	{
		this.emitter.change_state('CONN', [ethereum.selectedAddress]);
	}

	disconnect()
	{
		this.emitter.change_state('NCONN');
	}

}


class Session extends EventEmitter {
	constructor()
	{
		super();

		this.wallet_type = 'metamask';

		// https://github.com/MetaMask/metamask-onboarding/blob/main/src/index.ts
		this.onboarding = new MetaMaskOnboarding();

		this.state = new MetamaskState(this, 'init');
	}

	change_state(state, ...args)
	{
		console.log(`new state: ${state}`);

		if (this.state) {
			this.state.leave();
		}
		this.state = this.states[state];
		this.state.enter(...args);
	}

	async start()
	{
		this.states = {
			NINST: new NotInstalled(this),
			NCONNI: new DisconnectedInitial(this),
			NCONN: new Disconnected(this),
			CONN: new Connected(this)
		};

		const state = MetaMaskOnboarding.isMetaMaskInstalled()
			? 'NCONNI' :  'NINST';
		
		this.change_state(state);
	}

	stop()
	{
		if (this.state?.state === 'connect') {
			this.change_state('NCONN');
		}
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

	install()
	{
		this.state.install();
	}
}

export function metamask_deep_link()
{
	// deeplink generated in the below page
	// https://docs.metamask.io/guide/mobile-best-practices.html#deeplinking
	// https://metamask.github.io/metamask-deeplinks/
	const stem = location.href.replace(`${location.protocol}//`,'');
	return `https://metamask.app.link/dapp/${stem}`;
}

export default () => {
	return new Session();
}
