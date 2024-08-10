/**
 * An command with the expected response and delay
 */
export class OBDCommand {
	/**
	 * Creates an OBDCommand
	 *
	 * @param command - the command to send
	 * @param delay - the delay we are waiting for a repsonse
	 */
	public constructor(command: string, delay: number = 1000) {
		this.command = command;
		this.delay = delay;
	}

	/**
	 * Checks whether we have a response
	 *
	 * @returns true on success
	 */
	public hasResponse(): boolean {
		return this.response?.length ? true : false;
	}

	/**
	 * Processes the command to the OBD dongle
	 *
	 * @returns true on success or false on error
	 */
	public async process(): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			let timeout: NodeJS.Timeout | undefined;
			/**
			 * Handles the data we receive
			 *
			 * @param data - the data as provided by the stream parser
			 */
			/*
			const onData = (data: string) => {
				clearTimeout(timeout);
				this.response = data;
				console.log(`Received: ${data}`);
				parser.removeListener("data", onData);
				resolve(true);
			};
			parser.addListener("data", onData);
			console.log(`Sending: ${this.command}`);
			port.write(`${this.command}\r`);
			timeout = setTimeout(() => {
				parser.removeListener("data", onData);
				resolve(false);
			}, this.delay);
			*/
		});
	}

	public command: string;
	public response?: string;
	public delay: number;
}

export type OBDCommands = Array<OBDCommand>;
