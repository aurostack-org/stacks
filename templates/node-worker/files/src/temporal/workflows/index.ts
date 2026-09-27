import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities/index.js';

/**
 * Workflows orchestrate; activities act. This code is replayed from history to
 * rebuild state, so it must be deterministic: no I/O, no Date.now() or
 * Math.random() of its own (the SDK makes both replay-safe), no imports that
 * touch the network or filesystem. Anything like that belongs in an activity.
 *
 * Every function exported from this module is a workflow type, started by name
 * (see the API's TemporalService).
 */
const { greet } = proxyActivities<typeof activities>({
	startToCloseTimeout: '1 minute',
	retry: { maximumAttempts: 5 }
});

export async function example(input: { name: string }): Promise<string> {
	// A durable timer: survives worker restarts and deploys, for as long as
	// you like ('30 days' works the same way).
	await sleep('1 second');
	return await greet(input.name);
}
