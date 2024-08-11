import { theLogger } from "./globals";

// The resolve function
type resolveFunction = (value: true | string) => void;

// Flags to parameterize whether to log send commands and or responses to the console
export enum EShowSendAndResponse {
	nothing = 0,
	send = 1,
	response = 2,
	send_and_response = 3
}

/**
 * An command with the expected response and delay
 */
export class OBDCommand {
	/**
	 * Creates an OBDCommand
	 *
	 * @param command - the command to send
	 * @param bShowSendReply - flag whether we want to see sending and reply on the console or not
	 * @param delay - the delay we are waiting for a repsonse
	 */
	public constructor(command: string, bShowSendReply = EShowSendAndResponse.nothing, delay: number = 1000) {
		this.command = command;
		this.bShowSendReply = bShowSendReply;
		this.delay = delay;
	}

	/**
	 * Checks whether we have a response
	 *
	 * @returns true on success
	 */
	public hasResponse(): this is this & { response: string } {
		return this.response?.length ? true : false;
	}

	/**
	 * Puts the response into the object, logs it to the console if requested
	 *
	 * @param response - the response to set
	 */
	public setResponse(response: string): void {
		this.response = response.trim();
		if (this.bShowSendReply & EShowSendAndResponse.response)
			theLogger.log(`Response: ${this.response}`);
		if (this.resolve)
			this.resolve(true);
	}

	/**
	 * Retrieves the command and logs it to the console if requested
	 *
	 * @returns the command
	 */
	public getCommand(): string {
		const command = `${this.command}\r`;
		if (this.bShowSendReply & EShowSendAndResponse.send)
			theLogger.log(`Sending: ${command}`);
		return command;
	}

	/**
	 * Resolves the promise (data was received or an error occured)
	 *
	 * @param value - the value to resolve the promise, true on success or an error string
	 */
	public resolve(value: true | string): void {
		if (this.resolver)
			this.resolver(value);
	}

	/**
	 * Sets the promise resolver function
	 *
	 * @param resolver - the resolver function to complete the promise
	 */
	public setResolver(resolver: resolveFunction): void {
		this.resolver = resolver;
	}

	// The bare command without terminating newline
	public command: string;
	// The response (if available)
	public response?: string;
	// Flag whether we want to see sending and reply on the console or not
	public bShowSendReply: EShowSendAndResponse;
	// The maximum delay we want to wait for an answer
	public delay: number;
	// The completed promise which will get triggered by callbacks in teh ODBConnection class onData, onClose, onError callbacks
	private resolver?: resolveFunction;
}

export type OBDCommands = Array<OBDCommand>;
