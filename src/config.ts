import { EConfigTemplate, validators, ICoreConfig } from "@estos/ucconfig";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * The static config this package
 */
class StaticConfig {
	// The default timeout if we wait for data from the obd bus
	public readonly odb2_timeout = 100;
}

interface IEconfConfig extends StaticConfig {
	// The MAC address of the obd2 bluetooth dongle
	obd2MAC: string;
	// The serial port device name
	serialPort: string;
}

export type IConfig = IEconfConfig & ICoreConfig

/**
 * The config
 */
export class Config extends EConfigTemplate {
	private static _config: Config;
	private _configuration: IEconfConfig;
	// The singleton instance of this class
	private static instance: Config;

	/**
	 * Gets instance of OBDConnection to use as singleton.
	 *
	 * @returns - an instance of this class.
	 */
	public static getInstance(): Config {
		if (!Config.instance)
			Config.instance = new Config();
		return Config.instance;
	}

	/**
	 * Constructor --- you know?
	 */
	private constructor() {
		super("OBD");
		if (process.env["NODE_ENV"] === "test")
			dotenv.config({ path: ".env.test" });
		else
			dotenv.config();
		this.initCore();
		this._configuration = this.init();
		this.validate(true);
	}

	/**
	 * Getter for the main config
	 *
	 * @returns - IConfig object
	 */
	public get config(): IConfig {
		return { ...this._configuration, ...this.coreConfig };
	}

	/**
	 * Inits all configurations/settings from given environment variables
	 *
	 * @returns IEConfig - configuration by env
	 */
	public init(): IEconfConfig {
		const config: IEconfConfig = {
			...new StaticConfig(),
			obd2MAC: this.newProperty<string>("deviceMAC", validators.validateStringNotEmpty()),
			serialPort: this.newProperty<string>("serialPort", validators.validateString(), "/dev/rfcomm0")
		};
		return config;
	}

	/**
	 * Current working directory of the Node.js process
	 *
	 * @returns - current working directory of the Node.js process
	 */
	public get rootdir(): string {
		return process.cwd();
	}
}
