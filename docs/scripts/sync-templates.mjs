// Reads every template's manifest, .env examples and shipped Claude Code
// skills into one JSON file the docs render from, so feature tables, env
// references and skill lists can't drift from the templates. Also enforces that every env variable has a hand-written note in
// src/data/env-notes.json: a new variable fails the docs build until it's
// documented.
//
//   node scripts/sync-templates.mjs          write src/data/generated/templates.json
//   node scripts/sync-templates.mjs --check  also fail on undocumented variables
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatesRoot = path.resolve(docsRoot, '..', 'templates');
const outFile = path.join(docsRoot, 'src/data/generated/templates.json');
const notesFile = path.join(docsRoot, 'src/data/env-notes.json');

const START = /@feature:start\s+(.+?)\s*(?:-->|\*\/)?\s*$/;
const ELSE = /@feature:else\b/;
const END = /@feature:end\b/;
const LINE = /\s#\s*@feature\s+([^#]+?)\s*$/;
const VAR = /^([A-Z][A-Z0-9_]*)=(.*)$/;

/** Every .env*.example under a template's files/, relative paths sorted. */
function envFiles(dir, rel = '') {
	const found = [];
	for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
		if (entry.name === 'node_modules') continue;
		const child = path.join(rel, entry.name);
		if (entry.isDirectory()) found.push(...envFiles(dir, child));
		else if (/^\.env(\..+)?\.example$/.test(entry.name)) found.push(child);
	}
	return found.sort();
}

function unquote(value) {
	const v = value.trim();
	if (/^(['"]).*\1$/.test(v)) return v.slice(1, -1);
	return v;
}

/**
 * Variables in file order, each with the comment block above it (a block
 * applies to every variable up to the next blank line) and the feature
 * expression that keeps it.
 */
function parseEnv(text) {
	const vars = [];
	const stack = [];
	let comment = [];
	for (const raw of text.split('\n')) {
		const line = raw.trimEnd();
		if (START.test(line)) {
			stack.push({ expr: line.match(START)[1].trim(), else: false });
			continue;
		}
		if (ELSE.test(line)) {
			stack[stack.length - 1].else = true;
			continue;
		}
		if (END.test(line)) {
			stack.pop();
			continue;
		}
		if (!line.trim()) {
			comment = [];
			continue;
		}
		if (line.startsWith('#')) {
			comment.push(line.replace(/^#\s?/, ''));
			continue;
		}
		const inline = line.match(LINE);
		const body = inline ? line.slice(0, inline.index) : line;
		const match = body.match(VAR);
		if (!match) continue;
		const features = stack.map((f) => (f.else ? `not (${f.expr})` : f.expr));
		if (inline) features.push(inline[1].trim());
		vars.push({
			name: match[1],
			default: unquote(match[2]),
			comment: comment.join(' ').replace(/\s+/g, ' ').trim(),
			feature: features.join(' and ') || null
		});
	}
	return vars;
}

/** A manifest `files` glob as a RegExp over a project-relative path. */
function globRegExp(glob) {
	let re = '';
	for (let i = 0; i < glob.length; i++) {
		const ch = glob[i];
		if (ch === '*' && glob[i + 1] === '*') {
			re += '.*';
			i++;
			if (glob[i + 1] === '/') i++;
		} else if (ch === '*') re += '[^/]*';
		else re += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
	}
	return new RegExp(`^${re}$`);
}

/**
 * The task skills a template ships in `.claude/skills/<name>/SKILL.md`, from
 * their front matter, each with the feature whose `files` own it (null when it
 * ships with every project).
 */
function skillsOf(filesDir, features) {
	const dir = path.join(filesDir, '.claude', 'skills');
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const rel = `.claude/skills/${entry.name}/SKILL.md`;
			const text = fs.readFileSync(path.join(filesDir, rel), 'utf8');
			const front = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
			const field = (key) => front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim() ?? '';
			const owner = features.find((f) => f.files.some((glob) => globRegExp(glob).test(rel)));
			// The description's first sentence says what it does; the rest is
			// trigger phrases for the model, not for a reader.
			const summary = field('description').split(/\.\s+(?=USE|Use)/)[0].replace(/\.$/, '');
			return { name: field('name') || entry.name, summary, feature: owner?.key ?? null };
		})
		.sort((a, b) => Number(a.feature !== null) - Number(b.feature !== null) || a.name.localeCompare(b.name));
}

const templates = {};
for (const name of fs.readdirSync(templatesRoot).sort()) {
	const manifestPath = path.join(templatesRoot, name, 'template.json');
	if (!fs.existsSync(manifestPath)) continue;
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	const filesDir = path.join(templatesRoot, name, 'files');
	const features = Object.entries(manifest.features ?? {}).map(([key, f]) => ({
		key,
		title: f.title ?? key,
		description: f.description ?? '',
		default: Boolean(f.default),
		core: Boolean(f.core),
		requires: f.requires ?? [],
		files: f.files ?? [],
		packages: packagesOf(f)
	}));
	templates[name] = {
		name,
		title: manifest.title ?? name,
		description: manifest.description ?? '',
		version: manifest.version ?? null,
		features,
		hooks: (manifest.hooks ?? []).map((h) => ({
			title: h.title ?? h.run,
			run: h.run,
			when: h.when ?? null,
			optional: Boolean(h.optional)
		})),
		nextSteps: manifest.nextSteps ?? [],
		claudeMd: fs.existsSync(path.join(filesDir, 'CLAUDE.md')),
		skills: skillsOf(filesDir, features),
		env: envFiles(filesDir).map((file) => ({
			file: file.split(path.sep).join('/'),
			vars: parseEnv(fs.readFileSync(path.join(filesDir, file), 'utf8'))
		}))
	};
}

/** npm packages and pip requirements a feature adds, flattened. */
function packagesOf(feature) {
	const out = new Set(feature.requirements ?? []);
	const specs = [feature.packageJson].flat().filter(Boolean);
	for (const spec of specs) {
		for (const key of ['dependencies', 'devDependencies']) {
			for (const dep of spec[key] ?? []) out.add(dep);
		}
	}
	return [...out];
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ templates }, null, '\t') + '\n');
const varCount = Object.values(templates).reduce(
	(n, t) => n + t.env.reduce((m, f) => m + f.vars.length, 0),
	0
);
console.log(`templates.json: ${Object.keys(templates).length} templates, ${varCount} env entries`);

if (process.argv.includes('--check')) {
	const notes = fs.existsSync(notesFile) ? JSON.parse(fs.readFileSync(notesFile, 'utf8')) : {};
	const missing = [];
	for (const t of Object.values(templates)) {
		for (const f of t.env) {
			for (const v of f.vars) {
				if (!notes[`${t.name}:${v.name}`] && !notes[v.name]) missing.push(`${t.name} ${f.file} ${v.name}`);
			}
		}
	}
	const unique = [...new Set(missing)];
	if (unique.length) {
		console.error(`\n${unique.length} env variable(s) have no note in src/data/env-notes.json:`);
		for (const m of unique) console.error(`  ${m}`);
		console.error('\nAdd a note keyed by the variable name (or "template:NAME" for one template).');
		process.exit(1);
	}
	console.log('env notes: every variable documented');
}
