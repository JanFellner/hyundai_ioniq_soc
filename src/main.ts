import { theBatteryState, theConfig, theLogger, theOBDConnection } from "./globals";
import { Helpers } from "./helpers";
import { initCommands } from "./initCommands";
import { ELogEntry } from "./logger";
import { OBDCommand } from "./OBDCommand";
import express, { Application, Request, Response } from "express";
export const theWebServer: Application = express();
/*
 * Our main state
 */
enum eMainState {
	disconnected = 0,
	connected_uninitialized = 1,
	connected_initialized = 2,
	connected_read_soc = 3,
	connected_failed_to_read_soc = 4
}

let reentrant_protection = false;
let lastQuery = 0;
let errorCounter = 0;
let mainState = eMainState.disconnected;
let timeout: NodeJS.Timeout | undefined;

/**
 * EValuates if the last SOC value is more than 5 minutes old
 *
 * @returns true if this is the case
 */
function needsRequery(): boolean {
	const now = Date.now();
	const maxNoQuery = lastQuery + 5000;
	if (now > maxNoQuery)
		return true;
	else
		return false;
}

/**
 * Featches the SOC from the car
 *
 * @param caller - called from
 * @returns true if we were able to read the SOC, or false if not
 */
async function readSOC(caller: string): Promise<boolean> {
	let bSOCFound = false;
	lastQuery = Date.now();

	// If we are connected, let´s fetch the element that allows us to read the SOC
	const getSOCCommmand = new OBDCommand("2105");
	theLogger.log(`Querying SOC (${caller})`);
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
				theLogger.log(`Current SOC: ${newSoc}%`);
				bSOCFound = true;
			}
		}
		if (!bSOCFound)
			theLogger.warn("SOC currently not available");
	}

	return bSOCFound;
}

/**
 * Queries the SOC value from the car
 * Sets up the communication layer if needed and then tries to read the value from the car
 *
 * @param caller - called from
 * @returns true on success
 */
async function querySOC(caller: string): Promise<boolean> {
	if (reentrant_protection)
		return false;

	let bReturn = false;

	reentrant_protection = true;
	try {
	// Are we already connected?
		let bContinue = theOBDConnection.isConnected();
		if (!bContinue) {
		// If not check if we can connect
			const connectResult = await theOBDConnection.connect();
			if (connectResult === true) {
				theLogger.log("Connected, initializing OBD dongle");
				// Initialize the OBD dongel with the init commands
				const result = await theOBDConnection.handleCommand(initCommands);
				if (result === true) {
					theLogger.log("OBD dongle initialized...");
					bContinue = true;
				} else {
					theLogger.error("OBD dongle initialization failed");
					theLogger.error(result);
					theOBDConnection.disconnect();
				}
			} else
				theLogger.error(connectResult);
		}
		if (bContinue)
			bReturn = await readSOC(caller);
	} catch (error) {
	}
	reentrant_protection = false;

	return bReturn;
}

/**
 * the global loop that keeps everything going
 */
async function mainLoop(): Promise<void> {
	if (timeout)
		clearTimeout(timeout);
	let nextRun = 5000;
	let nextState = eMainState.disconnected;
	try {
		if (await querySOC("mainLoop")) {
			// if the SOC was readble, retry in 60 seconds
			nextRun = 60000;
			errorCounter = 0;
			nextState = eMainState.connected_read_soc;
		} else if (theOBDConnection.isConnected()) {
			if (mainState === eMainState.disconnected) {
				// We are now connected and came from disconnected
				// Reset the error counter
				errorCounter = 0;
			}
			nextState = eMainState.connected_failed_to_read_soc;
			if (errorCounter < 10) {
				// We loop fast when we came from disconncted to read the cars SOC
				// Car was approaching charing spot
				nextRun = 5000;
				errorCounter++;
			} else {
				// the SOC was not readable, but we are connected (so car is nearby)
				// Wait 15 minutes before retrying
				// If the direct urls are served the service retries queriy anyway
				nextRun = 15 * 60 * 1000;
			}
		} else {
			// We are not connected, so we could not connect to the car
			// Let´s wait 5 seconds before retrying
			// This allows us to read the SOC if the care drives to the charing point
			nextRun = 5000;
			nextState = eMainState.disconnected;
		}
	} catch (error: unknown) {
		// After an unhandled error we wait for 30 seconds
		theLogger.error(error);
		nextRun = 30000;
	}
	mainState = nextState;

	let logMessage = `Next run in ${Helpers.formatDuration(nextRun / 1000)}`;
	if (nextState === eMainState.connected_failed_to_read_soc && errorCounter <= 10)
		logMessage += ` (${errorCounter}/10)`;
	logMessage += "...";

	theLogger.log(logMessage);
	timeout = setTimeout(() => { void mainLoop(); }, 5000);
}

theWebServer.get("/soc_double", async (req: Request, res: Response) => {
	if (needsRequery())
		await querySOC("/soc_double");
	const soc = theBatteryState.soc || 0;
	res.send(`${soc}`);
});

theWebServer.get("/soc_integer", async (req: Request, res: Response) => {
	if (needsRequery())
		await querySOC("/soc_integer");
	const soc = Math.floor(theBatteryState.soc || 0);
	res.send(`${soc}`);
});

theWebServer.get("/fetch", async (req: Request, res: Response) => {
	let bSucceeded = await querySOC("/fetch");
	res.send(bSucceeded ? "succeeded" : "failed");
});

theWebServer.get("/clearlog", async (req: Request, res: Response) => {
	theLogger.clear();
	res.send("ok");
});

let resetReentrant = false;

theWebServer.get("/reset", async (req: Request, res: Response) => {
	if (resetReentrant) {
		res.send("a reset is in progress").status(500);
		return;
	}
	resetReentrant = true;
	if (timeout)
		clearTimeout(timeout);
	timeout = undefined;
	theOBDConnection.disconnect();
	theLogger.clear();
	const prom = new Promise<void>((resolve) => {
		setTimeout(() => {
			reentrant_protection = false;
			lastQuery = 0;
			errorCounter = 0;
			mainState = eMainState.disconnected;
			resolve();
		}, 250);
	});
	await prom;
	await mainLoop();
	res.send("ok");
	resetReentrant = false;
});

theWebServer.get("/distance", async (req: Request, res: Response) => {
	if (!theConfig.distance100) {
		res.status(500).send("Please provide distance100 in the .env file within the config to ensure the service is able to calculate the distance for the current SOC.");
		return;
	}
	if (needsRequery())
		await querySOC("/distance");
	const soc = Math.floor(theBatteryState.soc || 0);
	const distance = Math.floor(theConfig.distance100 * soc / 100);
	res.send(`${distance}`);
});

theWebServer.get("/", async (req: Request, res: Response) => {
	let body = "";
	body += "<table>\n";
	body += `<tr><td>SOC:</td><td>${theBatteryState.soc}%</td></tr>\n`;
	body += `<tr><td>Last read:</td><td>${Helpers.getTimeString(theBatteryState.lastChanged, false)}</td></tr>\n`;
	body += `<tr><td>OBD-Dongle:</td><td>${theConfig.obd2MAC} `;
	if (theOBDConnection.isConnected())
		body += `<span style="color: green; font-weight: bold;">connected</span>`;
	else
		body += `<span style="color: red; font-weight: bold;">not connected</span>`;
	body += "</td></tr>\n";
	body += `<tr><td>Links:</td><td><a target="_blank" href="/soc_integer">/soc_integer</a>&nbsp;<a target="_blank" href="/soc_double">/soc_double</a>&nbsp;<a target="_blank" href="/distance">/distance</a></td></tr>\n`;
	body += `<tr><td>Actions:</td><td><button onclick="fetch_and_reload()">Refresh SOC</button><button onclick="clear_log()">Clear log</button><button onclick="reset()">Reset</button></tr>\n`;
	body += "</table>\n";
	body += "<ul>\n";
	const logEntries = theLogger.getLogEntries();
	for (let i = logEntries.length - 1; i >= 0; i--) {
		const logEntry = logEntries[i];
		if (!logEntry)
			continue;
		const timeWithMilliseconds = Helpers.getTimeString(logEntry.time, true);
		if (logEntry.type === ELogEntry.error)
			body += `<li>${timeWithMilliseconds} - <span style="color: red">${logEntry.message}</span></li>\n`;
		else if (logEntry.type === ELogEntry.warn)
			body += `<li>${timeWithMilliseconds} - <span style="color: orange">${logEntry.message}</span></li>\n`;
		else
			body += `<li>${timeWithMilliseconds} - ${logEntry.message}</li>\n`;
	}
	body += "</ul>\n";

	let html = `\
	<!DOCTYPE html>\n\
	<html lang="en">\n\
	<head>\n\
    	<meta charset="UTF-8">\n\
    	<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\
		<meta http-equiv="refresh" content="5">\n\
    	<title>Ioniq SOC status page</title>\n\
		<style>\n\
			button {\n\
				margin: 2px;\n\
				cursor: pointer;\n\
			}\n\
	    </style>\n\
		<script>\n\
			async function fetch_and_reload() {\n\
				try {\n\
					const repsonse = await fetch('/fetch');\n\
					const result = await repsonse.text();\n\
					console.log(result);\n\
					location.reload();\n\
				}\n\
				catch(err) {\n\
					console.error(err);\n\
				}\n\
			}\n\
			async function clear_log() {\n\
				try {\n\
					const repsonse = await fetch('/clearlog');\n\
					location.reload();\n\
				}\n\
				catch(err) {\n\
					console.error(err);\n\
				}\n\
			}\n\
			async function reset() {\n\
				try {\n\
					const repsonse = await fetch('/reset');\n\
					location.reload();\n\
				}\n\
				catch(err) {\n\
					console.error(err);\n\
				}\n\
			}\n\
	    </script>\n\
	</head>\n\
	<body style="font-family: Arial, sans-serif;">\n\
	${body}
	</body>\n\
	</html>`;
	res.send(html);
});

theWebServer.listen(theConfig.port, () => {
	const ip = Helpers.getLocalIPAddress() || "*";
	theLogger.log(`Server is running at http://${ip}:${theConfig.port}`);
	theLogger.log("Starting main loop...");
	void mainLoop();
});
