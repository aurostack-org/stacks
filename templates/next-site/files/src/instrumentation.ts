/**
 * Next.js calls register() once per server process, before it handles a
 * request. Telemetry is off until connection settings are present (see
 * src/telemetry/config.ts), and the SDK is only loaded when it is on.
 */
export async function register() {
	if (process.env.NEXT_RUNTIME !== 'nodejs') return;

	const { resolveTelemetry } = await import('./telemetry/config');
	const telemetry = resolveTelemetry();
	if (!telemetry.enabled) return;

	const { startTelemetry } = await import('./telemetry/node');
	startTelemetry(telemetry);
}
