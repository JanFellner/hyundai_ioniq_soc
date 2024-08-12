import { IConfig } from "./config";

export enum ELogEntry {
	debug = 0,
	warn = 1,
	error = 2
}

/**
 * A log entry for the log cache
 */
class LogEntry {
	public readonly type: ELogEntry;
	public readonly message: unknown;
	public readonly time: Date;

	/**
	 * Constructs a log entry for the log cache
	 *
	 * @param type - the type of log entry
	 * @param message - the message
	 */
	public constructor(type: ELogEntry, message: unknown) {
		this.type = type;
		this.message = message;
		this.time = new Date();
	}
}

/**
 * A List of log entries
 */
class LogEntries extends Array<LogEntry> {

}

/**
 * The central logger
 * Logs to the console and has a short term log available through the webservice unter /status
 */
export class Logger {
	// The singleton instance of this class
	private static instance: Logger;
	// The config
	private config: IConfig;
	// The logentries cache
	private logEntries = new LogEntries();

	/**
	 * Constructs the Logger singleton
	 * Method is private as we follow the Singleton Approach using getInstance
	 *
	 * @param config - the config
	 */
	private constructor(config: IConfig) {
		this.config = config;
	}

	/**
	 * Gets instance of Logger to use as singleton.
	 *
	 * @param config - the config
	 * @returns - an instance of this class.
	 */
	public static getInstance(config: IConfig): Logger {
		if (!Logger.instance)
			Logger.instance = new Logger(config);
		return Logger.instance;
	}

	/**
	 * Logs a debug message to the console
	 * Adds a debug message to the log cache
	 *
	 * @param message - the message to add
	 */
	public log(message: string): void {
		this.logEntries.push(new LogEntry(ELogEntry.debug, message));
		this.handleLogLength();
	}

	/**
	 * Logs a warn message to the console
	 * Adds a warn message to the log cache
	 *
	 * @param message - the message to add
	 */
	public warn(message: string): void {
		this.logEntries.push(new LogEntry(ELogEntry.warn, message));
		this.handleLogLength();
	}

	/**
	 * Logs a error message to the console
	 * Adds a error message to the log cache
	 *
	 * @param message - the message to add
	 */
	public error(message: unknown): void {
		this.logEntries.push(new LogEntry(ELogEntry.error, message));
		this.handleLogLength();
	}

	/**
	 * Ensures that the log length is not exceeding the maximum allowed length
	 */
	private handleLogLength(): void {
		while (this.logEntries.length > this.config.logLength)
			this.logEntries.shift();
	}

	/**
	 * Retrieve the entries of the log cache
	 *
	 * @returns the log cache
	 */
	public getLogEntries(): LogEntries {
		return this.logEntries;
	}

	/**
	 * Clears the log entries
	 */
	public clear(): void {
		this.logEntries = [];
	}
}
