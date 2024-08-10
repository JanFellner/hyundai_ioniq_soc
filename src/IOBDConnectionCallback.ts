export interface IOBDConnectionCallback {
	// The connection was abnormally closed
	onConnectionClosed(): void;
	// The connection received an error
	onConnectionError(err: Error): void;
	// The connection receive data without processing an OBDCommand
	onData(data: string): void;
}
