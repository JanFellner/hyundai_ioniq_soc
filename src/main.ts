import { SerialPort, ReadlineParser } from "serialport";
import { EBluetoothStatus, Helpers } from "./helpers";

const obdLinkLX = "00:04:3E:85:0D:42";
const serialPortPath = "/dev/rfcomm0";

/**
 * Validate the bluetooth connection through a timer call
 */
function checkConnected(): void {
	const status = Helpers.isBluetoothDeviceConnected(obdLinkLX);
	if (status === EBluetoothStatus.connected) {
		// we are connected
		const port = new SerialPort({
			path: serialPortPath,
			baudRate: 9600
		});

		const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

		// Open the serial port
		port.on("open", () => {
			console.log("Serial port opened.");

			// Send data to the serial port
			port.write("Hello from Node.js!\n", (err) => {
				if (err) { console.log("Error writing to serial port:", err.message); return; }

				console.log("Message written to serial port.");
			});
		});

		// Read data from the serial port
		parser.on("data", (data: string) => {
			console.log("Data received:", data);
		});

		// Handle any errors
		port.on("error", (err) => {
			console.log("Error:", err.message);
		});
	}
}

// Set the connection interval
setInterval(() => { checkConnected(); }, 1000);
