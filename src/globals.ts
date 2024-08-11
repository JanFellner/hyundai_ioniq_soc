import { BatteryState } from "./BatteryState";
import { Config } from "./config";
import { OBDConnection } from "./OBDConnection";

const configInstance = Config.getInstance();
export const theConfig = configInstance.config;
export const theOBDConnection = OBDConnection.getInstance(theConfig);
export const theBatteryState = BatteryState.getInstance(theConfig);
