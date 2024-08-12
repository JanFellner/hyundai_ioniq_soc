import * as os from "os";
import { theLogger } from "./globals";

/**
 *Helper function to pad single-digit numbers with a leading zero
 *
 * @param number - the number to process
 * @returns the padded number
 */
function padZero(number: number) {
	return number < 10 ? "0" + number : number;
}

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

	/**
	 * GEt the current time as time with date (no timezone)
	 *
	 * @param time - the time to convert
	 * @param bMilliseconds - true to add the milliseconds
	 * @returns the current time as string
	 */
	public static getTimeString(time: Date | undefined, bMilliseconds: boolean) {
		if (!time)
			return "unknown";

		let result = "";

		const now = new Date();
		const compareNow = `${now.getFullYear()}${now.getMonth()}${now.getDate()}`;
		const compareTime = `${time.getFullYear()}${time.getMonth()}${time.getDate()}`;
		if (compareNow !== compareTime) {
			const year = time.getFullYear();
			const month = padZero(time.getMonth() + 1); // Months are zero-indexed
			const day = padZero(time.getDate());
			result += `${day}.${month}.${year}`;
		}

		if (result.length)
			result += ` `;
		const hours = time.getHours().toString().padStart(2, "0");
		const minutes = time.getMinutes().toString().padStart(2, "0");
		const seconds = time.getSeconds().toString().padStart(2, "0");
		result += `${hours}:${minutes}:${seconds}`;

		if (bMilliseconds) {
			const millisceonds = time.getMilliseconds().toString().padStart(3, "0");
			result += `:${millisceonds}`;
		}

		return result;
	}

	/**
	 * Transforms an amount of seconds into a reable notation with hours, minutes and seconds
	 *
	 * @param seconds - the seconds to convert
	 * @returns the amount as string
	 */
	public static formatDuration(seconds: number): string {
		if (seconds < 0)
			return "";

		const days = Math.floor(seconds / (24 * 3600));
		seconds %= 24 * 3600;
		const hours = Math.floor(seconds / 3600);
		seconds %= 3600;
		const minutes = Math.floor(seconds / 60);
		seconds %= 60;

		const parts = [];

		if (days > 0)
			parts.push(`${days} day${days !== 1 ? "s" : ""}`);
		if (hours > 0)
			parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
		if (minutes > 0)
			parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
		if (seconds > 0)
			parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);

		if (parts.length === 0)
			return "0 seconds";
		return parts.join(", ");
	}
}
