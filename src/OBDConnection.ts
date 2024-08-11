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
		const reachable = this.isBluetoothDeviceReachable(this.config.obd2MAC);
		if (reachable !== true)
			return reachable;

		this.port = new SerialPort({
			path: this.config.serialPort,
			baudRate: 9600,
			autoOpen: false,
			lock: false
		});

		this.parser = this.port.pipe(new ReadlineParser({ delimiter: ">" }));
		this.parser.addListener("data", this.onDataClass.bind(this));

		const prom = new Promise<true | string>((resolve) => {
			if (!this.port) {
				resolve("Port was not available inside promise!");
				return;
			}
			type done = (result: true | string) => void;
			const onError = (err: Error) => {
				done(err.message);
			};
			const onClose = () => {
				done("Port was closed unexpectedly");
			};
			const onOpen = () => {
				done(true);
			};

			/**
			 * Handles error, close and open and calls the resolve
			 *
			 * @param result - value for the resolve
			 */
			const done = (result: true | string) => {
				if (this.port) {
					this.port.removeListener("error", onError);
					this.port.removeListener("close", onClose);
					this.port.removeListener("open", onOpen);
				}
				if (result === true && this.port && this.parser) {
					console.log("Port is open, attaching notifies");
					// Hand over error, close and data handling to the class methods
					this.port.addListener("error", this.onError.bind(this));
					this.port.addListener("close", this.onClose.bind(this));
					this.port.addListener("data", (data: ArrayBuffer) => {
						console.log("port inline: ", data);
						console.log("port inline: ", data.toString());
					});
					this.parser.addListener("data", (data: unknown) => {
						console.log("parser inline: ", data);
					});
				}
				resolve(result);
			};
			this.port.addListener("error", onError);
			this.port.addListener("close", onClose);
			this.port.addListener("open", onOpen);
		});

		this.port.open();

		return prom;
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
	private onDataClass(data: string): void {
		console.log(`received in class: ${data}`);
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
		if (!Array.isArray(command))
			command = [command];
		for (const com of command) {
			if (!this.port || !this.parser)
				return false;

			const prom = new Promise<boolean>((resolve) => {
				if (!this.port || !this.parser) {
					resolve(false);
					return;
				}
				type done = (result: boolean) => void;
				const onError = () => {
					done(false);
				};
				const onClose = () => {
					done(false);
				};
				const onData = (data: string) => {
					console.log(`received: ${data}`);
					com.response = data;
					done(true);
				};
				const done = (result: boolean) => {
					if (this.port) {
						this.port.removeListener("error", onError);
						this.port.removeListener("close", onClose);
					}
					if (this.parser)
						this.parser.removeListener("data", onData);
					resolve(result);
				};
				this.port.addListener("error", onError);
				this.port.addListener("close", onClose);
				this.parser.on("data", onData);
				console.log(`Sending: ${com.command}`);
				this.port.write(`${com.command}\n`);
			});

			if (!await prom)
				return false;
		}

		return false;
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
