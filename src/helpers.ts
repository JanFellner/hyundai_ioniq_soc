import { execSync, ExecException, ExecSyncOptionsWithStringEncoding } from "child_process";

/**
 * The different bluetooth status values
 */
export enum EBluetoothStatus {
	error = -1,
	not_available = 0,
	not_connected = 1,
	connected = 2
}

/**
 * Helper functions mapped into a Helpers class
 */
export class Helpers {
	/**
	 * Validates if a certain bluetooth devices is connected or not
	 *
	 * @param deviceMacAddress - the mac of the bluetooth decvice
	 * @returns true if the device is connected or false if not. Throws if the devices is unknown or any other error
	 */
	public static isBluetoothDeviceConnected(deviceMacAddress: string): EBluetoothStatus {
		// Run the bluetoothctl command to get information about the device
		const options: ExecSyncOptionsWithStringEncoding = { stdio: "pipe", encoding: "ascii" };
		let stdout: string | undefined;
		let stderr: string | undefined;
		try {
			stdout = execSync(`bluetoothctl info ${deviceMacAddress}`, options);
		} catch (error: unknown) {
			stdout = (error as ExecException).stdout;
			stderr = (error as ExecException).stderr;
		}
		if (stdout?.length) {
			if (stdout.includes("Connected: yes"))
				return EBluetoothStatus.connected;
			else if (stdout.includes("Connected: no"))
				return EBluetoothStatus.not_connected;
			else if (stdout.includes("not available"))
				return EBluetoothStatus.not_available;
		}
		return EBluetoothStatus.error;
	}

	/**
	 * Retrieves the textual representation for a bluetooth status enum value
	 *
	 * @param status - the value to get the status for
	 * @returns the status as text
	 */
	public static getBluetoothStatusText(status: EBluetoothStatus): string {
		switch (status) {
			case EBluetoothStatus.error:
				return "error";
			case EBluetoothStatus.not_available:
				return "not available";
			case EBluetoothStatus.not_connected:
				return "not connected";
			case EBluetoothStatus.connected:
				return "connected";
			default:
				return "unknown";
		}
	}
}
