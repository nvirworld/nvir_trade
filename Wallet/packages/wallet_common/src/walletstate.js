//
// template pattern
//
export class State {
	constructor(emitter, state)
	{
		this.emitter = emitter;
		this.state = state;
	}

	enter(...args)
	{
		console.log(`enter => ${this.emitter.wallet_type}.${this.state}`, ...args);
		this.emitter.emit(this.state, this.emitter, ...args);
	}
}

export class WalletState extends State {
	constructor(emitter, state)
	{
		super(emitter, state);
	}

	async connect()
	{
		console.log(`Invalid method for ${this.emitter.wallet_type}.${this.state}`);
	}

	async disconnect()
	{
		console.log(`Invalid method for ${this.emitter.wallet_type}.${this.state}`);
	}

	async personal_sign(msg)
	{
		throw new Error(`Invalid method for ${this.emitter.wallet_type}.${this.state}`);
	}
}
