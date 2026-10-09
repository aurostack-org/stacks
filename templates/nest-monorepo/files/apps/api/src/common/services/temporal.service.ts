import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Client, Connection, type TLSConfig } from '@temporalio/client';
import { CustomConfigService } from './config.service';
import type Config from './config.service';

/**
 * A Temporal client for starting and querying workflows; a worker (node-worker
 * or py-worker) polling the same namespace and task queue runs them.
 *
 * The connection is lazy: nothing is dialled until the first call, so the API
 * boots, and serves everything else, while Temporal is unreachable.
 *
 * ```ts
 * const handle = await this.temporal.client.workflow.start('example', {
 *   taskQueue: this.temporal.taskQueue,
 *   workflowId: `example-${user.id}`, // one run per id: a natural dedupe key
 *   args: [{ name: user.name }]
 * });
 * const result = await handle.result(); // or return handle.workflowId
 * ```
 *
 * Reach for Temporal over the BullMQ queue when the work spans many steps,
 * waits (for minutes to months, or on a signal), or must resume exactly where
 * it stopped after a crash. A fire-and-forget job is still a queue job.
 */
@Injectable()
export class TemporalService implements OnApplicationShutdown {
	readonly client: Client;
	/** The default task queue, from TEMPORAL_TASK_QUEUE. */
	readonly taskQueue: string;
	private readonly connection: Connection;

	constructor(config: CustomConfigService) {
		const { address, namespace, taskQueue, tls } = config.temporal;
		this.connection = Connection.lazy({ address, tls: temporalTls(tls) });
		this.client = new Client({ connection: this.connection, namespace });
		this.taskQueue = taskQueue;
	}

	async onApplicationShutdown() {
		await this.connection.close();
	}
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
}: Config.Temporal['tls']): TLSConfig | null {
	if (!ca && !cert && !key) return null;
	if (!cert || !key) {
		throw new Error(
			'TEMPORAL_TLS_CERT and TEMPORAL_TLS_KEY must be set together'
		);
	}
	const pem = (value: string) => Buffer.from(value.replace(/\\n/g, '\n'));
	return {
		...(ca && { serverRootCACertificate: pem(ca) }),
		clientCertPair: { crt: pem(cert), key: pem(key) }
	};
}
