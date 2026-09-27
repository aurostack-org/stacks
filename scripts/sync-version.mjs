#!/usr/bin/env node
/**
 * Copy package.json's version into the plugin manifests. npm runs this from the
 * `version` lifecycle script, so `npm version <patch|minor|major>` bumps all
 * three in the one commit it tags; `stack doctor` fails if they ever disagree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const write = (rel, json) =>
	fs.writeFileSync(path.join(root, rel), JSON.stringify(json, null, '\t') + '\n');

const { version } = read('package.json');

const plugin = read('.claude-plugin/plugin.json');
plugin.version = version;
write('.claude-plugin/plugin.json', plugin);

const marketplace = read('.claude-plugin/marketplace.json');
for (const entry of marketplace.plugins) entry.version = version;
write('.claude-plugin/marketplace.json', marketplace);

console.log(`plugin manifests → ${version}`);
