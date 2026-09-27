#!/usr/bin/env node
/**
 * Fail unless the npm package would ship every git-tracked template file and no
 * maintainer-local config. npm silently drops some files (nested .gitignore,
 * .npmrc), which is why templates store those under an underscore alias.
 */
import { execSync } from 'node:child_process';

// Older npm prints an array of packages, newer npm an object keyed by name.
const output = JSON.parse(
	execSync('npm pack --dry-run --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
);
const [pkg] = Array.isArray(output) ? output : Object.values(output);
const packed = new Set(pkg.files.map((f) => f.path));
const tracked = execSync('git ls-files templates', { encoding: 'utf8' }).trim().split('\n');

const missing = tracked.filter((f) => !packed.has(f));
const leaked = [...packed].filter((f) => f.includes('stacks.local'));

if (missing.length || leaked.length) {
	if (missing.length) console.error('Not in the package:\n  ' + missing.join('\n  '));
	if (leaked.length) console.error('Must not be in the package:\n  ' + leaked.join('\n  '));
	process.exit(1);
}
console.log(`${pkg.name}@${pkg.version}: ${packed.size} files, all ${tracked.length} template files`);
