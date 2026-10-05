#!/usr/bin/env node
/**
 * Inspect and edit a generated project's .env without ever printing a value.
 *
 * Setup has to know which variables are still empty or at their example
 * value, write generated secrets, and copy a value from one service to
 * another (the API's basic-auth password into the frontend's API_DOC_PASSWORD)
 * without any of it passing through a terminal transcript or a model's
 * context. Every command here reports key names and states only.
 *
 *   node env.mjs status   <dir> [--file .env] [--example .env.example] [--required A,B]
 *   node env.mjs generate <dir> KEY [KEY...]         random 32-byte base64 per key
 *   node env.mjs set      <dir> KEY=VALUE [...]      non-secret values only
 *   node env.mjs copy     <fromDir> FROM_KEY <toDir> TO_KEY [--to-file .env]
 *
 * States: missing (no line), empty, example (identical to .env.example's
 * value, which is a placeholder or a local default), set. A key in .env.example
 * but not in .env is reported missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const LINE = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/;

function parse(text) {
	const out = new Map();
	for (const raw of text.split('\n')) {
		const m = raw.match(LINE);
		if (!m || raw.trimStart().startsWith('#')) continue;
		out.set(m[2], unquote(m[4]));
	}
	return out;
}

function unquote(value) {
	const v = value.trim();
	const q = v[0];
	if ((q === "'" || q === '"') && v.endsWith(q) && v.length >= 2) return v.slice(1, -1);
	return v.replace(/\s+#.*$/, '');
}

/** The quote character a file uses, so written lines match their neighbours. */
function quoteOf(text) {
	const m = text.match(/^[A-Za-z_][A-Za-z0-9_]*=(['"])/m);
	return m ? m[1] : "'";
}

function write(file, updates) {
	const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
	const q = quoteOf(text);
	const pending = new Map(updates);
	const lines = text.split('\n').map((raw) => {
		const m = raw.match(LINE);
		if (!m || raw.trimStart().startsWith('#') || !pending.has(m[2])) return raw;
		const line = `${m[1]}${m[2]}${m[3]}${q}${pending.get(m[2])}${q}`;
		pending.delete(m[2]);
		return line;
	});
	let out = lines.join('\n');
	if (pending.size) {
		out = out.replace(/\n*$/, '\n');
		for (const [key, value] of pending) out += `${key}=${q}${value}${q}\n`;
	}
	fs.writeFileSync(file, out, { mode: 0o600 });
}

const read = (file) => (fs.existsSync(file) ? parse(fs.readFileSync(file, 'utf8')) : null);

function opt(args, name, fallback) {
	const i = args.indexOf(name);
	if (i === -1) return fallback;
	const value = args[i + 1];
	args.splice(i, 2);
	return value;
}

function fail(message) {
	console.error(message);
	process.exit(1);
}

const [command, ...args] = process.argv.slice(2);

if (command === 'status') {
	const fileName = opt(args, '--file', '.env');
	const exampleName = opt(args, '--example', '.env.example');
	const required = (opt(args, '--required', '') || '').split(',').filter(Boolean);
	const [dir = '.'] = args;
	const env = read(path.join(dir, fileName));
	const example = read(path.join(dir, exampleName)) ?? new Map();
	if (!env) {
		console.log(`${fileName}: does not exist`);
		process.exit(0);
	}
	const keys = [...new Set([...example.keys(), ...env.keys(), ...required])];
	const rows = keys.map((key) => {
		const state = !env.has(key)
			? 'missing'
			: env.get(key) === ''
				? 'empty'
				: example.has(key) && env.get(key) === example.get(key)
					? 'example'
					: 'set';
		return { key, state, required: required.includes(key) };
	});
	for (const state of ['missing', 'empty', 'example', 'set']) {
		const group = rows.filter((r) => r.state === state);
		if (!group.length) continue;
		console.log(`${state} (${group.length}): ${group.map((r) => (r.required ? `${r.key}*` : r.key)).join(', ')}`);
	}
	if (required.length) console.log('* = required by the caller');
} else if (command === 'generate') {
	const [dir, ...keys] = args;
	if (!dir || !keys.length) fail('Usage: env.mjs generate <dir> KEY [KEY...]');
	write(
		path.join(dir, '.env'),
		keys.map((key) => [key, crypto.randomBytes(32).toString('base64')])
	);
	console.log(`generated: ${keys.join(', ')}`);
} else if (command === 'set') {
	const [dir, ...pairs] = args;
	if (!dir || !pairs.length) fail('Usage: env.mjs set <dir> KEY=VALUE [...]');
	const updates = pairs.map((pair) => {
		const i = pair.indexOf('=');
		if (i < 1) fail(`Not KEY=VALUE: ${pair.split('=')[0]}`);
		return [pair.slice(0, i), pair.slice(i + 1)];
	});
	write(path.join(dir, '.env'), updates);
	console.log(`set: ${updates.map(([k]) => k).join(', ')}`);
} else if (command === 'copy') {
	const toFile = opt(args, '--to-file', '.env');
	const fromFile = opt(args, '--from-file', '.env');
	const [fromDir, fromKey, toDir, toKey] = args;
	if (!toKey) fail('Usage: env.mjs copy <fromDir> FROM_KEY <toDir> TO_KEY');
	const from = read(path.join(fromDir, fromFile));
	if (!from?.has(fromKey) || from.get(fromKey) === '') fail(`${fromKey} is not set in ${fromDir}/${fromFile}`);
	write(path.join(toDir, toFile), [[toKey, from.get(fromKey)]]);
	console.log(`copied: ${fromKey} → ${toKey}`);
} else {
	fail('Usage: env.mjs status|generate|set|copy … (see the header of this file)');
}
