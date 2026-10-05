#!/usr/bin/env node
/**
 * `stack upgrade` must land a project exactly where `stack new` would today.
 *
 *   node scripts/check-upgrade.mjs <template> <fromVersion> [workdir] [-- new options]
 *
 * Generates the template with the given release (from npm), commits, runs
 * `stack upgrade` with this checkout's CLI, then generates it fresh with this
 * checkout and compares the two trees. `.env` is compared by its keys only:
 * upgrade never rewrites a value the user's `.env` holds (it reports changed
 * defaults instead).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STACK = path.join(ROOT, 'cli', 'stack.mjs');
const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const [template, from, workdir] = sep === -1 ? argv : argv.slice(0, sep);
const extra = sep === -1 ? [] : argv.slice(sep + 1);
if (!template || !from) {
	console.error('Usage: node scripts/check-upgrade.mjs <template> <fromVersion> [workdir] [-- new options]');
	process.exit(1);
}

const base = workdir ? path.resolve(workdir) : fs.mkdtempSync(path.join(os.tmpdir(), 'check-upgrade-'));
const upgraded = path.join(base, 'upgraded', 'demo');
const fresh = path.join(base, 'fresh', 'demo');
const run = (cmd, args, cwd = ROOT) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] });

// The old release, as people installed it.
const release = path.join(base, 'release');
fs.mkdirSync(release, { recursive: true });
const tarball = run('npm', ['pack', `@aurostack/stacks@${from}`, '--pack-destination', release, '--silent'], release)
	.toString()
	.trim()
	.split('\n')
	.pop();
run('tar', ['-xzf', tarball, '--strip-components=1', '-C', release], release);

run(process.execPath, [path.join(release, 'cli', 'stack.mjs'), 'new', template, upgraded, '--strict', ...extra]);
run(process.execPath, [STACK, 'new', template, fresh, '--strict', ...extra]);
process.stdout.write(run(process.execPath, [STACK, 'upgrade', '--strict'], upgraded));

const SKIP = new Set(['node_modules', '.git', '.yarn', '.venv', '__pycache__', 'generated', 'dist']);
const files = (root) => {
	const out = [];
	const rec = (dir, rel) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (SKIP.has(entry.name)) continue;
			const r = rel ? `${rel}/${entry.name}` : entry.name;
			if (entry.isDirectory()) rec(path.join(dir, entry.name), r);
			else out.push(r);
		}
	};
	rec(root, '');
	return out.filter((f) => f !== 'stack.json').sort();
};
const envKeys = (file) =>
	fs
		.readFileSync(file, 'utf8')
		.split('\n')
		.filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
		.map((line) => line.slice(0, line.indexOf('=')))
		.sort()
		.join('\n');

const a = files(upgraded);
const b = files(fresh);
const problems = [
	...a.filter((f) => !b.includes(f)).map((f) => `only after stack upgrade: ${f}`),
	...b.filter((f) => !a.includes(f)).map((f) => `only in a fresh stack new: ${f}`)
];
for (const f of a.filter((f) => b.includes(f))) {
	const x = path.join(upgraded, f);
	const y = path.join(fresh, f);
	const same = path.basename(f) === '.env' ? envKeys(x) === envKeys(y) : fs.readFileSync(x).equals(fs.readFileSync(y));
	if (!same) problems.push(`differs: ${f}`);
}
const json = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'stack.json'), 'utf8'));
if (JSON.stringify(json(upgraded).features) !== JSON.stringify(json(fresh).features)) problems.push('stack.json features differ');
if (json(upgraded).stackVersion !== json(fresh).stackVersion) problems.push('stack.json stackVersion not bumped');

if (problems.length) {
	console.error(`${template} from ${from}: stack upgrade does not match a fresh stack new`);
	for (const p of problems) console.error(`  ${p}`);
	process.exit(1);
}
console.log(`${template} from ${from}: identical to a fresh stack new (${a.length} files)`);
