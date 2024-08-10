/**
 * Helper functions mapped into a Helpers class
 */
export class Helpers {
	/**
	 * Function to convert ArrayBuffer to a string assuming ASCII encoding
	 *
	 * @param buffer - Data to convert
	 * @returns the converted string
	 */
	public static arrayBufferToAsciiString(buffer: ArrayBuffer): string {
		// Create a Uint8Array view over the buffer
		const uint8Array = new Uint8Array(buffer);

		// Use TextDecoder to decode the byte array into a string with ASCII encoding
		const decoder = new TextDecoder("ascii");
		const text = decoder.decode(uint8Array);

		return text;
	}
}
