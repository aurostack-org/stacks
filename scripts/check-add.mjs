#!/usr/bin/env node
/**
 * `stack add` must land a project exactly where `stack new --with` would have.
 *
 *   node scripts/check-add.mjs <template> <feature> [workdir]
 *
 * Generates the template with its defaults, commits, adds the feature, then
 * generates it again with the feature from the start and compares the two
 * trees. `.env` is compared by its keys and values only: `stack add` appends
 * new keys under a comment rather than where `.env.example` places them.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STACK = path.join(ROOT, 'cli', 'stack.mjs');
const [template, feature, workdir] = process.argv.slice(2);
if (!template || !feature) {
	console.error('Usage: node scripts/check-add.mjs <template> <feature> [workdir]');
	process.exit(1);
}

const base = workdir ? path.resolve(workdir) : fs.mkdtempSync(path.join(os.tmpdir(), 'check-add-'));
const added = path.join(base, 'added', 'demo');
const fresh = path.join(base, 'fresh', 'demo');
const stack = (args, cwd = ROOT) =>
	execFileSync(process.execPath, [STACK, ...args], { cwd, stdio: ['ignore', 'pipe', 'inherit'] });

stack(['new', template, added, '--strict']);
stack(['new', template, fresh, '--with', feature, '--strict']);
process.stdout.write(stack(['add', feature, '--strict'], added));

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
const envPairs = (file) =>
	fs
		.readFileSync(file, 'utf8')
		.split('\n')
		.filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
		.sort()
		.join('\n');

const a = files(added);
const b = files(fresh);
const problems = [
	...a.filter((f) => !b.includes(f)).map((f) => `only after stack add: ${f}`),
	...b.filter((f) => !a.includes(f)).map((f) => `only in a fresh --with ${feature}: ${f}`)
];
for (const f of a.filter((f) => b.includes(f))) {
	const x = path.join(added, f);
	const y = path.join(fresh, f);
	const same =
		path.basename(f) === '.env'
			? envPairs(x) === envPairs(y)
			: fs.readFileSync(x).equals(fs.readFileSync(y));
	if (!same) problems.push(`differs: ${f}`);
}

const features = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'stack.json'), 'utf8')).features;
if (JSON.stringify(features(added)) !== JSON.stringify(features(fresh))) {
	problems.push('stack.json features differ');
}

if (problems.length) {
	console.error(`${template} + ${feature}: stack add does not match stack new --with ${feature}`);
	for (const p of problems) console.error(`  ${p}`);
	process.exit(1);
}
console.log(`${template} + ${feature}: identical to stack new --with ${feature} (${a.length} files)`);
