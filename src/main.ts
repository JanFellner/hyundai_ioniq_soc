import { theOBDConnection } from "./globals";
import { OBDCommand } from "./OBDCommand";

let timer: NodeJS.Timeout | undefined;
let bReentrant = false;

// Sending a 2105 we will receive a line with the following sample data:

// 7EC2403E80203E80191 SOC 72%
// 7EC2403E80203E80192 SOC 73%
// 7EC2403E80203E80195 SOC 74%
// 7EC2403E80203E80196 SOC 75%

const initCommands: OBDCommand[] =
[
	// Reset settings to defaults
	new OBDCommand("ATD"),

	// Reboot the device
	new OBDCommand("ATZ"),

	// Show programmable parameters (OBDLink only)
	// 00:FF F  01:FF F  02:FF F  03:19 F
	// 04:01 F  05:FF F  06:F1 F  07:09 F
	// 08:FF F  09:00 F  0A:0A F  0B:FF F
	// 0C:23 F  0D:0D F  0E:5A F  0F:FF F
	// 10:0D F  11:00 F  12:00 F  13:F4 F
	// 14:FF F  15:0A F  16:FF F  17:92 F
	// 18:00 F  19:28 F  1A:0A F  1B:0A F
	// 1C:FF F  1D:FF F  1E:FF F  1F:FF F
	// 20:FF F  21:FF F  22:FF F  23:FF F
	// 24:00 F  25:00 F  26:00 F  27:FF F
	// 28:FF F  29:FF F  2A:04 F  2B:02 F
	// 2C:E0 F  2D:04 F  2E:80 F  2F:0A F
	new OBDCommand("ATTPS"),

	// No echo
	// OK
	new OBDCommand("ATE0"),

	// no CRLF 0x0D 0xA just CR 0x0D
	// OK
	new OBDCommand("ATL0"),

	// Print spaces (we skip them in software, but for diagnostic it´s easier when reading plain transport messages)
	// OK
	new OBDCommand("ATS1"),

	// Print OBD Link version information (differs from the ATI information as the ATI just says i am ELM327 device)
	// STN1155 v5.6.19
	new OBDCommand("STI"),

	// Prints the manufcaturer:
	// OBD Solutions LLC
	new OBDCommand("STMFR"),

	// Enable OBDLink LEDs
	// OK
	new OBDCommand("STUIL1"),

	// Display voltage
	// 12.6V
	new OBDCommand("ATRV"),

	// Provide header information in reponses
	// OK
	new OBDCommand("ATH1"),

	// Set protocol to ISO 15765-4 (11bit ID, 500kbit)
	// OK
	new OBDCommand("ATSP6")
];

/**
 * the global loop that keeps everything going
 */
async function globalLoop(): Promise<void> {
	if (bReentrant)
		return;

	bReentrant = true;
	try {
		let bContinue = theOBDConnection.isConnected();
		if (!bContinue) {
			const connectResult = await theOBDConnection.connect();
			if (connectResult !== true)
				console.error(connectResult);
			else
				bContinue = await theOBDConnection.handleCommand(initCommands);
		}
		if (bContinue) {
			const getSOCCommmand = new OBDCommand("2105");
			if (await theOBDConnection.handleCommand(getSOCCommmand))
				console.log("jippie");
		}
	} catch (error: unknown) {
		console.error(error);
	}
	bReentrant = false;
}

/**
 * Activates or deactivates the timer that triggers everything
 *
 * @param bActive - to activate or deactivate the timer
 */
function configureTimer(bActive: boolean): void {
	if (bActive && !timer)
		timer = setInterval(() => { void globalLoop(); }, 1000);
	else if (!bActive && timer) {
		clearInterval(timer);
		timer = undefined;
	}
}

configureTimer(true);
