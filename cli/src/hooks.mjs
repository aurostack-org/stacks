/**
 * Post-generation hooks: install deps, generate the Prisma client, init git.
 *
 * A hook is { run, when?, cwd?, optional?, title? }. `when` is a feature
 * expression, so `yarn prisma generate` only runs for stacks that kept Prisma.
 * A non-optional hook that fails aborts with a non-zero exit; an optional one
 * warns and continues, because a missing `yarn` on the machine should not throw
 * away an otherwise-correct scaffold.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { evalExpr } from './strip.mjs';
import { interpolate } from './tokens.mjs';

export function runHooks(manifest, target, enabled, ctx, { skip = false, log }) {
	const hooks = manifest.hooks || [];
	const results = [];

	for (const hook of hooks) {
		if (hook.when && !evalExpr(hook.when, enabled)) continue;
		const command = interpolate(hook.run, ctx);
		const cwd = path.join(target, interpolate(hook.cwd || '.', ctx));
		const label = hook.title || command;

		if (skip) {
			log(`  skipped  ${label}`);
			results.push({ command, status: 'skipped' });
			continue;
		}

		log(`  running  ${label}`);
		const res = spawnSync(command, {
			cwd,
			shell: true,
			stdio: 'inherit',
			env: process.env
		});

		if (res.status === 0) {
			results.push({ command, status: 'ok' });
			continue;
		}

		if (hook.optional) {
			log(`  warning  "${label}" failed (exit ${res.status}) — continuing`);
			results.push({ command, status: 'failed-optional' });
			continue;
		}

		results.push({ command, status: 'failed' });
		throw new Error(`Hook failed: ${label} (exit ${res.status})`);
	}

	return results;
}
