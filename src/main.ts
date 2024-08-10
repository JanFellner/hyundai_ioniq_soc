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
	new OBDCommand("ATZ"),
	new OBDCommand("ATE0"),
	new OBDCommand("ATL0"),
	new OBDCommand("ATS0"),
	new OBDCommand("STI"),
	new OBDCommand("ATE0"),
	new OBDCommand("STMFR"),
	new OBDCommand("STUIL1"),
	new OBDCommand("ATRV"),
	new OBDCommand("ATH1"),
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
