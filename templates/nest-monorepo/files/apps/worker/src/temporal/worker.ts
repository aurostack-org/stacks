import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	DefaultLogger,
	NativeConnection,
	Runtime,
	Worker,
	type LogLevel,
	type TLSConfig
} from '@temporalio/worker';
import config from '#app/config.js';
import logger from '#app/logger.js';
import * as activities from './activities/index.js';

const here = fileURLToPath(import.meta.url);

const PINO_LEVEL = {
	TRACE: 'trace',
	DEBUG: 'debug',
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error'
} as const satisfies Record<LogLevel, string>;

/**
 * Connects to Temporal and returns a worker for TEMPORAL_TASK_QUEUE, running
 * the workflows in ./workflows and the activities in ./activities. Temporal's
 * own logs go through pino, like everything else here.
 */
export async function createTemporalWorker(): Promise<Worker> {
	Runtime.install({
		logger: new DefaultLogger(runtimeLogLevel(), ({ level, message, meta }) =>
			logger[PINO_LEVEL[level]](meta ?? {}, message)
		)
	});

	const { address, namespace, taskQueue, tls } = config.temporal;
	const connection = await NativeConnection.connect({
		address,
		tls: temporalTls(tls)
	});

	return Worker.create({
		connection,
		namespace,
		taskQueue,
		// Workflows run in a sandbox from their own bundle, built from this
		// entry point when the worker starts: index.ts under tsx, index.js in dist.
		workflowsPath: path.join(
			path.dirname(here),
			'workflows',
			`index${path.extname(here)}`
		),
		activities
	});
}

/**
 * mTLS settings from PEM strings; none at all means plaintext (`null`).
 * Escaped `\n` are unescaped, so a certificate fits on one line of an env
 * file.
 */
export function temporalTls({
	ca,
	cert,
	key
}: typeof config.temporal.tls): TLSConfig | null {
	if (!ca && !cert && !key) return null;
	if (!cert || !key) {
		throw new Error('TEMPORAL_TLS_CERT and TEMPORAL_TLS_KEY must be set together');
	}
	const pem = (value: string) => Buffer.from(value.replace(/\\n/g, '\n'));
	return {
		...(ca ? { serverRootCACertificate: pem(ca) } : {}),
		clientCertPair: { crt: pem(cert), key: pem(key) }
	};
}

/** LOG_LEVEL as Temporal's level; pino's fatal/silent map to ERROR. */
function runtimeLogLevel(): LogLevel {
	const level = config.app.logLevel.toUpperCase();
	if (level in PINO_LEVEL) return level as LogLevel;
	return level === 'FATAL' || level === 'SILENT' ? 'ERROR' : 'INFO';
}
