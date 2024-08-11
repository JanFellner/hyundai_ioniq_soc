import { theBatteryState, theConfig, theOBDConnection } from "./globals";
import { Helpers } from "./helpers";
import { initCommands } from "./initCommands";
import { OBDCommand } from "./OBDCommand";
import express, { Application, Request, Response } from "express";
export const theWebServer: Application = express();

let lastQuery = 0;

/**
 * EValuates if the last SOC value is more than 5 minutes old
 *
 * @returns true if this is the case
 */
function needsRequery(): boolean {
	const now = Date.now();
	const maxNoQuery = lastQuery + 60000 * 5;
	if (now > maxNoQuery)
		return true;
	else
		return false;
}

/**
 * Featches the SOC from the car
 *
 * @returns true if we were able to read the SOC, or false if not
 */
async function readSOC(): Promise<boolean> {
	let bSOCFound = false;
	lastQuery = Date.now();

	// If we are connected, let´s fetch the element that allows us to read the SOC
	const getSOCCommmand = new OBDCommand("2105");
	console.log("Querying SOC");
	if (await theOBDConnection.handleCommand(getSOCCommmand) && getSOCCommmand.hasResponse()) {
		// Sending a 2105 we will receive a line with the following sample data:
		// 7EC 24 03 E8 02 03 E8 01 91 SOC 72%
		// 7EC 24 03 E8 02 03 E8 01 92 SOC 73%
		// 7EC 24 03 E8 02 03 E8 01 95 SOC 74%
		// 7EC 24 03 E8 02 03 E8 01 96 SOC 75%

		// If the car is sleeping (no ignition, not charging), we receive a pretty empty list here
		const response = getSOCCommmand.response;
		const elements = response.split("\r");
		for (let element of elements) {
			element = element.trim();
			if (element.substring(0, 6) === "7EC 24") {
				const socHex = element.substring(element.length - 2, element.length);
				const newSoc = parseInt(socHex, 16) / 2;
				theBatteryState.setSoc(newSoc);
				console.log(`Current SOC: ${newSoc}%`);
				bSOCFound = true;
			}
		}
		if (!bSOCFound)
			console.log("SOC currently not available");
	}
	return bSOCFound;
}

/**
 * Queries the SOC value from the car
 * Sets up the communication layer if needed and then tries to read the value from the car
 *
 * @returns true on success
 */
async function querySOC(): Promise<boolean> {
	// Are we already connected?
	let bContinue = theOBDConnection.isConnected();
	if (!bContinue) {
		// If not check if we can connect
		const connectResult = await theOBDConnection.connect();
		if (connectResult === true) {
			console.log("Connected, initializing OBD dongle");
			// Initialize the OBD dongel with the init commands
			bContinue = await theOBDConnection.handleCommand(initCommands);
			if (bContinue)
				console.log("OBD dongle initialized...");
		} else
			console.error(connectResult);
	}
	if (bContinue)
		return await readSOC();
	return false;
}

/**
 * the global loop that keeps everything going
 */
async function globalLoop(): Promise<void> {
	let nextRun = 5000;
	try {
		if (await querySOC())
			nextRun = 60000;
		else
			nextRun = 600000;
	} catch (error: unknown) {
		// After an unhandled error we wait for 30 seconds
		console.error(error);
		nextRun = 30000;
	}
	console.log(`Next run in ${nextRun / 1000}seconds...`);
	setTimeout(() => { void globalLoop(); }, nextRun);
}

theWebServer.get("/soc_double", async (req: Request, res: Response) => {
	if (needsRequery())
		await querySOC();
	const soc = theBatteryState.soc || 0;
	res.send(`${soc}`);
});

theWebServer.get("/soc_integer", async (req, res) => {
	if (needsRequery())
		await querySOC();
	const soc = Math.floor(theBatteryState.soc || 0);
	res.send(`${soc}`);
});

theWebServer.get("/distance", async (req, res) => {
	if (!theConfig.distance100) {
		res.status(500).send("Please provide distance100 in the .env file within the config to ensure the service is able to calculate the distance for the current SOC.");
		return;
	}
	if (needsRequery())
		await querySOC();
	const soc = Math.floor(theBatteryState.soc || 0);
	const distance = Math.floor(theConfig.distance100 * soc / 100);
	res.send(`${distance}`);
});

theWebServer.listen(theConfig.port, () => {
	const ip = Helpers.getLocalIPAddress() || "*";
	console.log(`Server is running at http://${ip}:${theConfig.port}`);
});

void globalLoop();
