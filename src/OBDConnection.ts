import { execSync, ExecSyncOptionsWithStringEncoding } from "child_process";
import { ReadlineParser, SerialPort } from "serialport";
import { IConfig } from "./config";
import { OBDCommand, OBDCommands } from "./OBDCommand";
import { IOBDConnectionCallback } from "./IOBDConnectionCallback";

/**
 * Handles the connection to the car.
 *
 * Provides the communication layer that interacts with the Bluetooth OBD device
 */
export class OBDConnection {
	// The singleton instance of this class
	private static instance: OBDConnection;
	// The serial port we use for the communication
	private port?: SerialPort;
	// The parser that is used to segmentize the serial port data
	private parser?: ReadlineParser;
	// The config
	private config: IConfig;
	// Callbacks that are called on specific events
	private callbacks = new Set<IOBDConnectionCallback>();
	// The currently handled command
	// The onData, onError, onClose commands will target this command
	private currentCommand?: OBDCommand;

	/**
	 * Constructs the OBDConnection singleton
	 * Method is private as we follow the Singleton Approach using getInstance
	 *
	 * @param config - the config
	 */
	private constructor(config: IConfig) {
		this.config = config;
	}

	/**
	 * Gets instance of OBDConnection to use as singleton.
	 *
	 * @param config - the config
	 * @returns - an instance of this class.
	 */
	public static getInstance(config: IConfig): OBDConnection {
		if (!OBDConnection.instance)
			OBDConnection.instance = new OBDConnection(config);
		return OBDConnection.instance;
	}

	/**
	 * Connects to the vehicle
	 *
	 * @returns true on success or an error description in case of an error
	 */
	public async connect(): Promise<true | string> {
		try {
			// Ensure the bluetooth obd2 token is reachable
			const reachable = this.isBluetoothDeviceReachable(this.config.obd2MAC);
			if (reachable !== true)
				return reachable;

			// Construct and configure the serial port
			this.port = new SerialPort({
				path: this.config.serialPort,
				baudRate: 9600,
				autoOpen: false
			});

			// Attach the data parser to the port
			this.parser = this.port.pipe(new ReadlineParser({ delimiter: ">" }));
			this.parser.addListener("data", this.onData.bind(this));

			// Implement the asynchronity for the callback open
			const prom = new Promise<true | string>((resolve) => {
				if (!this.port) {
					resolve("Port was undefined");
					return;
				}
				this.port.open((err: Error | null) => {
					if (err)
						resolve(err.message);
					else
						resolve(true);
				});
			});

			// Let´s open the port and wait for it
			const result = await prom;
			if (result === true) {
				// Port is open, let´s attach the notifies
				this.port.addListener("error", this.onError.bind(this));
				this.port.addListener("close", this.onClose.bind(this));
			} else {
				// An error has occured
				console.error("Error opening port: ", result);
				this.port = undefined;
				this.parser = undefined;
			}

			return result;
		} catch (error: unknown) {
			const msg = (error as Error).message;
			console.error("Unknown exception while opening port: ", msg);
			return msg;
		}
	}

	/**
	 * Checks whether we are connected
	 *
	 * @returns true if we are connected
	 */
	public isConnected(): boolean {
		if (!this.port || !this.parser)
			return false;
		return this.port.isOpen;
	}

	/**
	 * Adds a connection callback
	 *
	 * @param callback - the callback object that shall get called
	 */
	public addConnectionCallback(callback: IOBDConnectionCallback) {
		this.callbacks.add(callback);
	}

	/**
	 * Removes a connection callback
	 *
	 * @param callback - the callback object that shall get called
	 */
	public removeConnectionCallback(callback: IOBDConnectionCallback) {
		this.callbacks.delete(callback);
	}

	/**
	 * Disconnects from the verhicle
	 */
	public disconnect(): void {
		if (this.port) {
			this.port.removeAllListeners();
			this.port.close();
		}
		this.port = undefined;
		this.parser = undefined;
	}

	/**
	 * Called when the serial port stream parser has received a message
	 *
	 * @param data - the data the parser has read from the serial port
	 */
	private onData(data: string): void {
		if (this.currentCommand)
			this.currentCommand.setResponse(data);
		else
			console.warn(`Received data without processing a command: ${data}`);
	}

	/**
	 * Called when the serial port gets closed
	 */
	private onClose(): void {
		console.error(`Port was closed`);
		if (this.port) {
			this.port.removeAllListeners();
			this.port = undefined;
		}
		this.parser = undefined;
		if (this.currentCommand)
			this.currentCommand.resolve(`Port was closed`);
		for (const callback of this.callbacks)
			callback.onConnectionClosed();
	}

	/**
	 * Called when the serial port sees an error
	 *
	 * @param err - the error as provided from the serial port
	 */
	private onError(err: Error): void {
		console.error(`Port received an error ${err}`);
		if (this.port) {
			this.port.close();
			this.port.removeAllListeners();
			this.port = undefined;
		}
		this.parser = undefined;
		if (this.currentCommand)
			this.currentCommand.resolve(`Port received an error ${err}`);
		for (const callback of this.callbacks)
			callback.onConnectionError(err);
	}

	/**
	 * Handles commands
	 *
	 * @param command - one or multiple OBD commands to handle
	 * @returns true in case all commands have been procesed successfully
	 */
	public async handleCommand(command: OBDCommand | OBDCommands): Promise<boolean> {
		let bSuccess = true;

		// Make an array if we have none (makes handling later easier)
		if (!Array.isArray(command))
			command = [command];

		// Process through the differnet commands
		for (const com of command) {
			// If we have no port or parser we can quit here
			if (!this.port || !this.parser) {
				console.log("Have no port or parser in handleCommand inside the loop");
				bSuccess = false;
				break;
			}

			// Set the current command so that the callbacks can properly fill data into it
			this.currentCommand = com;
			let timeout: NodeJS.Timeout | undefined;

			const prom = new Promise<true | string>((resolve) => {
				if (!this.port || !this.parser) {
					console.log("Have no port or parser in handleCommand inside the promise");
					return;
				}

				// Send the data
				this.port.write(com.getCommand());

				// Create a timeout callback that resolves to timeout
				timeout = setTimeout(() => {
					timeout = undefined;
					resolve("Timed out");
				}, com.delay);

				// Attach the resolve to the command
				// The resolve is called in the class for the differente events (onData, onClose, onError)
				com.resolve = resolve;
			});

			const result = await prom;

			// Clear the timeout if it still exists
			if (timeout) {
				clearTimeout(timeout);
				timeout = undefined;
			}
			// If an error occured a string is returned, in that case we can instantly termiante here
			if (result !== true) {
				bSuccess = false;
				break;
			}
		}

		return bSuccess;
	}

	/**
	 * Validates if a certain bluetooth devices is reachable or not
	 *
	 * @param deviceMacAddress - the mac of the bluetooth decvice
	 * @returns true if the device is reachable or false if not.
	 */
	private isBluetoothDeviceReachable(deviceMacAddress: string): true | string {
		// Run the l2ping command to check whether the device is pingable
		const options: ExecSyncOptionsWithStringEncoding = { stdio: "pipe", encoding: "ascii" };
		const command = `sudo l2ping -c 1 -s 1 -f ${deviceMacAddress}`;
		try {
			execSync(command, options);
			console.log(`${command} succeeded`);
			return true;
		} catch (error: unknown) {
			console.error(`${command} failed`);
			return JSON.stringify(error);
		}
	}
}
