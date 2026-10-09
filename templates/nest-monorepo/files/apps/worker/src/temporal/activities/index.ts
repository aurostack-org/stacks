import { Context, log } from '@temporalio/activity';

/**
 * Activities do the real work: I/O, database writes, calls to other services.
 * Temporal retries a failed activity on its own (per the retry policy set in
 * the workflow), so throw on failure and make each one safe to run twice.
 */
export async function greet(name: string): Promise<string> {
	log.info('Greeting', { name });
	// Stand-in for real work. The context's sleep is cancellation-aware: it
	// rejects if the workflow cancels this activity.
	await Context.current().sleep(100);
	return `Hello, ${name}!`;
}
