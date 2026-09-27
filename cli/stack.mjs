#!/usr/bin/env node
/**
 * `stack` — scaffold a new project from a house template.
 *
 * Plain Node ESM with zero dependencies and no build step, so it runs the same
 * from the npm package, the Claude Code plugin, or a git checkout.
 *
 *   stack list
 *   stack info <template>
 *   stack new <template> <dir> [--with a,b] [--without c] [--all]
 *   stack extract <template> [--source dir] [--overwrite] [--prune]
 *   stack doctor [template]
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
	loadManifest,
	listTemplates,
	resolveFeatures,
	featureSummary,
	expandHome,
	sourceConfig
} from './src/manifest.mjs';
import { generate } from './src/generate.mjs';
import { extract } from './src/extract.mjs';
import { runHooks } from './src/hooks.mjs';
import {
	collectFeatureNames,
	stripFeatures,
	bracketBalance
} from './src/strip.mjs';
import { walk, matcher, isTextFile, readText, DEFAULT_SKIP_DIRS } from './src/fsx.mjs';
import { kebab, interpolate } from './src/tokens.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(
	fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
).version;

// Colour only when attached to a terminal, so piping the output into a file
// or another tool yields clean text.
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const c = {
	bold: paint(1),
	dim: paint(2),
	green: paint(32),
	yellow: paint(33),
	red: paint(31),
	cyan: paint(36)
};

const log = (...args) => console.log(...args);
// Accepts `--with a,b` and repeated `--with a --with b` alike.
const csv = (v) =>
	[]
		.concat(v ?? [])
		.flatMap((s) => String(s).split(','))
		.map((s) => s.trim())
		.filter(Boolean);

const USAGE = `
${c.bold('stack')} — scaffold a new project from a house template

${c.bold('Commands')}
  list                              List available templates
  info <template>                   Show a template's features and defaults
  new <template> <dir> [options]    Generate a project
  extract <template> [options]      Refresh a template from its source repo
  doctor [template]                 Validate templates against their manifests
  version                           Print the stack version (also --version)

${c.bold('new options')}
  --name <name>        Project name        ${c.dim('(default: basename of <dir>)')}
  --scope <scope>      npm scope, no @     ${c.dim('(default: --name)')}
  --description <s>    Package description
  --port <n>           Default listen port
  --with a,b           Enable optional features (repeatable)
  --without a,b        Disable default features (repeatable)
  --all                Enable every optional feature
  --no-hooks           Skip install / prisma generate / git init
  --strict             Fail on any hook failure (for CI)
  --force              Write into a non-empty directory
  --dry-run            Print what would happen, write nothing

${c.bold('extract options')}
  --source <dir>       Override the source path in stacks.local.json
  --overwrite          Replace template files that already differ
  --prune              Delete template files the source no longer has
  --dry-run

${c.bold('Examples')}
  stack new nest-api ~/Projects/acme/api --with realtime,media
  stack new react-monorepo ~/Projects/acme/web --with app-landing,app-admin
  stack extract nest-api --source ~/Projects/acme/web/backend
`;

function cmdList() {
	const names = listTemplates(ROOT);
	if (names.length === 0) {
		log(c.yellow('No templates found in'), path.join(ROOT, 'templates'));
		return;
	}
	log('');
	for (const name of names) {
		const m = loadManifest(ROOT, name);
		const hasFiles = fs.existsSync(m.__filesDir);
		const count = Object.keys(m.features).length;
		log(
			`  ${c.bold(c.cyan(name.padEnd(18)))} ${m.title || ''}` +
				(hasFiles ? '' : c.yellow('  [not extracted]'))
		);
		if (m.description) log(`  ${' '.repeat(18)} ${c.dim(m.description)}`);
		log(`  ${' '.repeat(18)} ${c.dim(`${count} features`)}`);
		log('');
	}
}

function cmdInfo(name) {
	const m = loadManifest(ROOT, name);
	log('');
	log(`  ${c.bold(m.title || m.name)}  ${c.dim(m.name)}`);
	if (m.description) log(`  ${m.description}`);
	log('');
	const core = [];
	const on = [];
	const off = [];
	for (const [fname, def] of Object.entries(m.features)) {
		const row = `    ${fname.padEnd(20)} ${c.dim(def.title || '')}`;
		if (def.core) core.push(row);
		else if (def.default) on.push(row);
		else off.push(row);
	}
	if (core.length) {
		log(c.bold('  Always included'));
		core.forEach((r) => log(r));
		log('');
	}
	if (on.length) {
		log(c.bold('  On by default') + c.dim('  (--without <name> to drop)'));
		on.forEach((r) => log(r));
		log('');
	}
	if (off.length) {
		log(c.bold('  Opt-in') + c.dim('  (--with <name> to add)'));
		off.forEach((r) => log(r));
		log('');
	}
	for (const [fname, def] of Object.entries(m.features)) {
		if (def.requires?.length) {
			log(c.dim(`  ${fname} requires ${def.requires.join(', ')}`));
		}
	}
	log('');
}

function cmdNew(args, values) {
	const [templateName, dirArg] = args;
	if (!templateName || !dirArg) {
		log(c.red('Usage: stack new <template> <dir>'));
		process.exit(1);
	}

	const manifest = loadManifest(ROOT, templateName);
	const target = path.resolve(expandHome(dirArg));
	const name = kebab(values.name || path.basename(target));

	const options = {
		name,
		toolVersion: VERSION,
		scope: values.scope,
		description: values.description,
		port: values.port ? Number(values.port) : undefined,
		author: values.author,
		with: csv(values.with),
		without: csv(values.without),
		all: Boolean(values.all),
		dryRun: Boolean(values['dry-run']),
		force: Boolean(values.force)
	};

	const { report, ctx, enabled } = generate(manifest, target, options);

	log('');
	log(`  ${c.bold(manifest.title || manifest.name)} → ${c.cyan(target)}`);
	log(`  ${c.dim('name')}      ${ctx.name}`);
	log(`  ${c.dim('scope')}     @${ctx.scope}`);
	log(`  ${c.dim('features')}  ${c.green(report.enabled.join(', ') || '—')}`);
	if (report.disabled.length) {
		log(`  ${c.dim('omitted')}   ${c.dim(report.disabled.join(', '))}`);
	}
	log(
		`  ${c.dim('files')}     ${report.written.length} written, ` +
			`${report.dropped.length} dropped, ${report.pruned} package keys pruned`
	);
	log('');

	if (options.dryRun) {
		log(c.yellow('  dry run — nothing written'));
		log('');
		return;
	}

	if (manifest.hooks?.length) {
		log(c.bold('  Post-generation'));
		runHooks(manifest, target, enabled, ctx, {
			skip: values['no-hooks'],
			strict: Boolean(values.strict),
			log
		});
		log('');
	}

	log(c.green('  Done.'));
	if (manifest.nextSteps?.length) {
		log('');
		log(c.bold('  Next'));
		for (const step of manifest.nextSteps) log(`    ${interpolate(step, ctx)}`);
	}
	log('');
}

function cmdExtract(args, values) {
	const [templateName] = args;
	if (!templateName) {
		log(c.red('Usage: stack extract <template>'));
		process.exit(1);
	}
	// npm and Claude Code install stack as a copy that the next update
	// replaces, so an extract there would write into files that get thrown away.
	if (!fs.existsSync(path.join(ROOT, '.git'))) {
		throw new Error(
			`extract writes into the templates, so it needs a git checkout, not an installed copy (${ROOT}).\n` +
				'  git clone https://github.com/aurostack-org/stacks.git && cd stacks && bash install.sh\n' +
				'  then run extract from that checkout.'
		);
	}
	const manifest = loadManifest(ROOT, templateName);
	const config = sourceConfig(ROOT, manifest);
	const report = extract(manifest, {
		source: values.source,
		config,
		overwrite: Boolean(values.overwrite),
		prune: Boolean(values.prune),
		dryRun: Boolean(values['dry-run'])
	});

	log('');
	log(`  ${c.bold(manifest.name)} ← ${c.cyan(expandHome(values.source || config.path))}`);
	log(`  ${c.dim('copied')}     ${report.copied.length}`);
	log(`  ${c.dim('unchanged')}  ${report.skipped}`);
	if (report.conflicts.length) {
		log(`  ${c.yellow('conflicts')}  ${report.conflicts.length} ${c.dim('(differ from source; --overwrite to replace)')}`);
		for (const f of report.conflicts.slice(0, 40)) log(`    ${c.yellow(f)}`);
		if (report.conflicts.length > 40) {
			log(c.dim(`    … ${report.conflicts.length - 40} more`));
		}
	}
	if (report.orphans.length) {
		log(`  ${c.dim('template-only')}  ${report.orphans.length} ${c.dim('(no source counterpart)')}`);
		for (const f of report.orphans.slice(0, 20)) log(`    ${c.dim(f)}`);
		if (report.orphans.length > 20) {
			log(c.dim(`    … ${report.orphans.length - 20} more`));
		}
	}
	log('');
}


/**
 * tsconfig.json and nest-cli.json are JSONC — comments and trailing commas are
 * legal there and must not be reported as damage.
 */
function stripJsonc(text) {
	let out = '';
	let inString = false;
	let inLine = false;
	let inBlock = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const next = text[i + 1];
		if (inLine) {
			if (ch === '\n') {
				inLine = false;
				out += ch;
			}
			continue;
		}
		if (inBlock) {
			if (ch === '*' && next === '/') {
				inBlock = false;
				i++;
			}
			continue;
		}
		if (inString) {
			out += ch;
			if (ch === '\\') {
				out += next ?? '';
				i++;
			} else if (ch === '"') {
				inString = false;
			}
			continue;
		}
		if (ch === '"') {
			inString = true;
			out += ch;
			continue;
		}
		if (ch === '/' && next === '/') {
			inLine = true;
			i++;
			continue;
		}
		if (ch === '/' && next === '*') {
			inBlock = true;
			i++;
			continue;
		}
		out += ch;
	}
	return out.replace(/,(\s*[}\]])/g, '$1');
}


/**
 * Feature selections worth checking. Not the full 2^n power set — the two
 * extremes plus each optional feature flipped on its own from the defaults,
 * which is where a missed annotation actually shows up.
 */
function presetsFor(manifest) {
	const optional = Object.entries(manifest.features)
		.filter(([, def]) => !def.core)
		.map(([name]) => name);

	const presets = [
		{ label: 'all', opts: { with: [], without: [], all: true } },
		{ label: 'defaults', opts: { with: [], without: [] } }
	];
	// Everything that transitively requires `name`, so dropping a dependency also
	// drops its dependents rather than being reported as an impossible selection.
	const closureOf = (name) => {
		const out = new Set([name]);
		let grew = true;
		while (grew) {
			grew = false;
			for (const [other, def] of Object.entries(manifest.features)) {
				if (out.has(other)) continue;
				if ((def.requires || []).some((r) => out.has(r))) {
					out.add(other);
					grew = true;
				}
			}
		}
		return [...out];
	};

	for (const name of optional) {
		const def = manifest.features[name];
		if (def.default) {
			const without = closureOf(name).filter((f) => !manifest.features[f].core);
			const label =
				without.length > 1 ? `without ${name} (+dependents)` : `without ${name}`;
			presets.push({ label, opts: { with: [], without } });
		} else {
			presets.push({ label: `with ${name}`, opts: { with: [name], without: [] } });
		}
	}
	return presets;
}

const IMPORT_RE = /(?:from|import)\s+['"]([^'"]+)['"]/g;
const RESOLVE_EXT = ['', '.ts', '.tsx', '.js', '.mjs', '.json', '/index.ts', '/index.tsx'];

/**
 * Candidate on-disk paths for one specifier.
 *
 * ESM TypeScript (`moduleResolution: nodenext`) writes `./foo.js` for a file
 * that is `./foo.ts` on disk — the extension names the *output*. Resolving the
 * literal string finds nothing, so rewrite that form as well.
 */
function resolutionCandidates(target) {
	const bases = [target];
	const jsLike = target.match(/^(.*)\.(js|mjs|cjs)$/);
	if (jsLike) bases.push(jsLike[1]);
	return bases.flatMap((base) => RESOLVE_EXT.map((ext) => base + ext));
}

/**
 * Resolve intra-project imports against the files a selection actually keeps.
 *
 * This is the check that catches a barrel re-exporting a module the selection
 * deleted — `export * from './queue.module'` in a build with no queue. Nothing
 * else notices until the generated project fails to compile.
 */
function danglingImports(manifest, enabled, files, aliasRoots) {
	// Paths produced by a build step (the Prisma client, say) do not exist in the
	// template and must not be reported as missing.
	const isGenerated = matcher(manifest.generatedPaths || []);
	const dropped = [];
	for (const [fname, def] of Object.entries(manifest.features)) {
		if (enabled.has(fname) || !def.files?.length) continue;
		dropped.push(matcher(def.files));
	}
	const kept = files.filter((rel) => !dropped.some((m) => m(rel)));
	const keptSet = new Set(kept);
	const resolves = (target) =>
		resolutionCandidates(target).some((candidate) => keptSet.has(candidate));

	const problems = [];
	for (const rel of kept) {
		if (!/\.tsx?$/.test(rel)) continue;
		const { content } = stripFeatures(
			readText(path.join(manifest.__filesDir, rel)),
			enabled
		);
		const dir = path.posix.dirname(rel);
		for (const m of content.matchAll(IMPORT_RE)) {
			const spec = m[1];
			let target = null;

			if (spec.startsWith('.')) {
				target = path.posix.normalize(path.posix.join(dir, spec));
			} else {
				const alias = Object.keys(aliasRoots).find((a) => spec.startsWith(a));
				if (alias) {
					// Skip aliases pointing at build output (e.g. the Prisma client),
					// which only exists after a generate step.
					if (aliasRoots[alias] === null) continue;
					target = path.posix.join(aliasRoots[alias], spec.slice(alias.length));
				} else {
					// A bare specifier is only ours if its first segment is a real
					// top-level source directory (tsconfig baseUrl: ./src).
					const head = spec.split('/')[0];
					if (!kept.some((f) => f.startsWith(`src/${head}/`) || f === `src/${head}.ts`)) {
						continue;
					}
					target = path.posix.join('src', spec);
				}
			}
			if (target && !isGenerated(target) && !resolves(target)) {
				problems.push(`${rel} imports "${spec}", which this selection does not include`);
			}
		}
	}
	return problems;
}

function doctorOne(name) {
	const m = loadManifest(ROOT, name);
	const problems = [];

	if (!fs.existsSync(m.__filesDir)) {
		return [`${name}: no files/ directory — run \`stack extract ${name}\``];
	}

	const files = walk(m.__filesDir, { skipDirs: DEFAULT_SKIP_DIRS });
	const declared = new Set(Object.keys(m.features));
	const referenced = new Set();

	for (const rel of files) {
		if (!isTextFile(rel)) continue;
		for (const fname of collectFeatureNames(readText(path.join(m.__filesDir, rel)))) {
			referenced.add(fname);
		}
	}

	for (const fname of referenced) {
		if (!declared.has(fname)) {
			problems.push(
				`${name}: files reference feature "${fname}", which template.json does not declare ` +
					`(a typo here silently deletes code)`
			);
		}
	}

	// A feature whose file globs match nothing is almost always a stale path.
	for (const [fname, def] of Object.entries(m.features)) {
		if (!def.files?.length) continue;
		const match = matcher(def.files);
		if (!files.some(match)) {
			problems.push(`${name}: feature "${fname}" has files globs that match nothing`);
		}
	}

	// Requirements must resolve.
	for (const [fname, def] of Object.entries(m.features)) {
		for (const dep of def.requires || []) {
			if (!declared.has(dep)) {
				problems.push(`${name}: feature "${fname}" requires undeclared "${dep}"`);
			}
		}
	}

	// TypeScript must survive stripping with its brackets still balanced. This is
	// what catches an inline marker parked on the closing line of a multi-line
	// import or object literal — the template itself compiles, so only a
	// generated project would ever reveal it.
	// .tsx is excluded: JSX prose ("you're") defeats a naive string tokenizer,
	// and the email templates it covers carry no markers anyway.
	const presets = presetsFor(m);
	const seenImportProblems = new Set();

	for (const { label, opts } of presets) {
		let enabled;
		try {
			enabled = resolveFeatures(m, opts);
		} catch {
			continue; // an impossible selection is not a template defect
		}

		// TypeScript must survive stripping with its brackets still balanced —
		// this is what catches an inline marker parked on the closing line of a
		// multi-line import or object literal.
		for (const rel of files) {
			if (!rel.endsWith('.ts')) continue;
			const raw = readText(path.join(m.__filesDir, rel));
			if (!raw.includes('@feature')) continue;
			if (bracketBalance(raw) !== 0) {
				if (label === 'all') {
					problems.push(
						`${name}: ${rel} does not have balanced brackets in the template itself`
					);
				}
				continue;
			}
			const balance = bracketBalance(stripFeatures(raw, enabled).content);
			if (balance !== 0) {
				problems.push(
					`${name}: ${rel} is left unbalanced (${balance > 0 ? '+' : ''}${balance}) ` +
						`with [${label}] — a marker is probably on the closing line of a ` +
						`multi-line construct; wrap the whole thing in @feature:start/@feature:end`
				);
			}
		}

		// JSON must still parse — stripping must never leave half an object.
		for (const rel of files) {
			if (path.extname(rel) !== '.json') continue;
			const { content } = stripFeatures(readText(path.join(m.__filesDir, rel)), enabled);
			try {
				JSON.parse(stripJsonc(content));
			} catch (err) {
				problems.push(`${name}: ${rel} is not valid JSON with [${label}] — ${err.message}`);
			}
		}

		// And nothing may import a file this selection deleted. Report each
		// distinct problem once, tagged with the first selection that hit it —
		// the same missing annotation otherwise repeats for every preset.
		for (const problem of danglingImports(m, enabled, files, m.aliasRoots || {})) {
			if (seenImportProblems.has(problem)) continue;
			seenImportProblems.add(problem);
			problems.push(`${name}: [${label}] ${problem}`);
		}
	}

	return [...new Set(problems)];
}

/**
 * The plugin manifests repeat package.json's version; a release that bumps one
 * and not the others ships an npm package and a plugin that disagree. Only
 * checked where the manifests exist (a checkout or the plugin, not npm).
 */
function versionProblems() {
	const problems = [];
	for (const rel of ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
		const file = path.join(ROOT, rel);
		if (!fs.existsSync(file)) continue;
		const json = JSON.parse(fs.readFileSync(file, 'utf8'));
		const versions = rel.endsWith('marketplace.json')
			? (json.plugins || []).map((p) => p.version)
			: [json.version];
		for (const v of versions) {
			if (v !== VERSION) problems.push(`${rel} says ${v}, package.json says ${VERSION}`);
		}
	}
	return problems;
}

function cmdDoctor(args) {
	const names = args[0] ? [args[0]] : listTemplates(ROOT);
	let total = 0;
	log('');
	if (!args[0]) {
		const problems = versionProblems();
		total += problems.length;
		if (problems.length === 0) log(`  ${c.green('ok')}  version ${VERSION}`);
		else {
			log(`  ${c.red('!!')}  version`);
			for (const p of problems) log(`      ${c.yellow(p)}`);
		}
	}
	for (const name of names) {
		const problems = doctorOne(name);
		total += problems.length;
		if (problems.length === 0) {
			log(`  ${c.green('ok')}  ${name}`);
		} else {
			log(`  ${c.red('!!')}  ${name}`);
			for (const p of problems) log(`      ${c.yellow(p)}`);
		}
	}
	log('');
	if (total > 0) process.exit(1);
}

function main() {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		strict: false,
		options: {
			name: { type: 'string' },
			scope: { type: 'string' },
			description: { type: 'string' },
			author: { type: 'string' },
			port: { type: 'string' },
			with: { type: 'string', multiple: true },
			without: { type: 'string', multiple: true },
			source: { type: 'string' },
			all: { type: 'boolean' },
			force: { type: 'boolean' },
			overwrite: { type: 'boolean' },
			prune: { type: 'boolean' },
			'dry-run': { type: 'boolean' },
			'no-hooks': { type: 'boolean' },
			strict: { type: 'boolean' },
			help: { type: 'boolean', short: 'h' },
			version: { type: 'boolean', short: 'v' }
		}
	});

	const [command, ...rest] = positionals;

	if (values.version || command === 'version') {
		log(VERSION);
		return;
	}

	if (!command || values.help || command === 'help') {
		log(USAGE);
		return;
	}

	switch (command) {
		case 'list':
			return cmdList();
		case 'info':
			return cmdInfo(rest[0]);
		case 'new':
			return cmdNew(rest, values);
		case 'extract':
			return cmdExtract(rest, values);
		case 'doctor':
			return cmdDoctor(rest);
		default:
			log(c.red(`Unknown command "${command}"`));
			log(USAGE);
			process.exit(1);
	}
}

try {
	main();
} catch (err) {
	console.error('');
	console.error(c.red(`  ${err.message}`));
	console.error('');
	process.exit(1);
}
