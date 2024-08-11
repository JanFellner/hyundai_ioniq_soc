import * as fs from "fs";
import * as path from "path";
import { IConfig } from "./config";

/**
 * Status information for the battery state
 */
export class BatteryState {
	// The singleton instance of this class
	private static instance: BatteryState;
	// State of Charge, initially undefined
	public soc?: number;
	// Timestamp of last change, initially undefined
	public lastChanged?: Date;
	// The config
	private config: IConfig;
	// Filename for the soc.json file
	private fileName: string;

	/**
	 * Constructs the OBDConnection singleton
	 * Method is private as we follow the Singleton Approach using getInstance
	 *
	 * @param config - the config
	 */
	private constructor(config: IConfig) {
		this.config = config;
		this.fileName = path.resolve(__dirname, this.config.socFileName);
		this.load();
	}

	/**
	 * Gets instance of OBDConnection to use as singleton.
	 *
	 * @param config - the config
	 * @returns - an instance of this class.
	 */
	public static getInstance(config: IConfig): BatteryState {
		if (!BatteryState.instance)
			BatteryState.instance = new BatteryState(config);
		return BatteryState.instance;
	}

	/**
	 * Set the state of charge and update the last changed timestamp
	 *
	 * @param soc - the new soc
	 */
	public setSoc(soc: number): void {
		this.soc = soc;
		this.lastChanged = new Date(); // Update the timestamp
		this.save();
	}

	/**
	 * Save the current state to a JSON file
	 */
	public save(): void {
		const data = {
			soc: this.soc,
			lastChanged: this.lastChanged ? this.lastChanged.toISOString() : null
		};

		fs.writeFileSync(this.fileName, JSON.stringify(data, null, 4));
	}

	/**
	 * Load the state from a JSON file
	 */
	public load(): void {
		try {
			const data = fs.readFileSync(this.fileName, "utf-8");
			const parsed = JSON.parse(data) as BatteryState;
			this.soc = parsed.soc !== null ? parsed.soc : undefined;
			this.lastChanged = parsed.lastChanged ? new Date(parsed.lastChanged) : undefined;
		} catch (error) {
		}
	}
}
