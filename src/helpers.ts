import * as os from "os";
import { theLogger } from "./globals";

/**
 * Helper functions mapped into a Helpers class
 */
export class Helpers {
	/**
	 * Retrieve a local ipv4 address
	 *
	 * @returns an IPV4 if available
	 */
	public static getLocalIPAddress(): string | undefined {
		const networkInterfaces = os.networkInterfaces();

		for (const interfaceName in networkInterfaces) {
			const interfaces = networkInterfaces[interfaceName];

			if (interfaces) {
				for (const networkInterface of interfaces) {
					// Check for IPv4 and that it's not an internal (i.e., localhost) address
					if (networkInterface.family === "IPv4" && !networkInterface.internal) {
						theLogger.log(`IP Address: ${networkInterface.address}`);
						return networkInterface.address;
					}
				}
			}
		}
		return undefined;
	}
}
