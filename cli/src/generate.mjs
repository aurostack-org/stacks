/**
 * Generation: templates/<t>/files -> a new project directory.
 *
 * Pipeline per file:
 *   1. drop it entirely if a disabled feature owns it (`features.x.files`)
 *   2. rewrite its path through `pathReplacements`
 *   3. strip `@feature` regions for disabled features
 *   4. apply `replacements` (renaming the project)
 *   5. prune package.json keys belonging to disabled features
 */
import path from 'node:path';
import fs from 'node:fs';
import {
	walk,
	matcher,
	isTextFile,
	readText,
	writeText,
	copyBinary,
	DEFAULT_SKIP_DIRS
} from './fsx.mjs';
import { stripFeatures, evalExpr } from './strip.mjs';
import {
	buildContext,
	interpolate,
	compileReplacements,
	applyReplacements
} from './tokens.mjs';
import { resolveFeatures } from './manifest.mjs';

/** Detect a JSON file's existing indentation so we round-trip it faithfully. */
function detectIndent(raw) {
	const m = raw.match(/\n([ \t]+)"/);
	if (!m) return '\t';
	return m[1].includes('\t') ? '\t' : m[1];
}

/**
 * Remove dependency / script keys owned by disabled features.
 * `spec` is either { dependencies, devDependencies, scripts } (implicitly
 * targeting `package.json` at the project root) or an array of such objects
 * each carrying a `file`.
 */
function collectPrunes(manifest, enabled) {
	/** @type {Map<string, { dependencies: Set<string>, devDependencies: Set<string>, scripts: Set<string> }>} */
	const byFile = new Map();

	const add = (file, spec) => {
		if (!byFile.has(file)) {
			byFile.set(file, {
				dependencies: new Set(),
				devDependencies: new Set(),
				scripts: new Set()
			});
		}
		const bucket = byFile.get(file);
		for (const key of ['dependencies', 'devDependencies', 'scripts']) {
			for (const entry of spec[key] || []) bucket[key].add(entry);
		}
	};

	for (const [name, def] of Object.entries(manifest.features)) {
		if (enabled.has(name) || !def.packageJson) continue;
		const specs = Array.isArray(def.packageJson)
			? def.packageJson
			: [def.packageJson];
		for (const spec of specs) add(spec.file || 'package.json', spec);
	}

	return byFile;
}

/**
 * Remove requirement lines owned by disabled features. Matching is on the
 * distribution name only, so a pin (`SQLAlchemy==2.0.50`) or an extra
 * (`uvicorn[standard]`) is removed by naming just `SQLAlchemy` / `uvicorn`.
 */
function collectRequirementPrunes(manifest, enabled) {
	const drop = new Set();
	for (const [name, def] of Object.entries(manifest.features)) {
		if (enabled.has(name) || !def.requirements) continue;
		for (const req of def.requirements) drop.add(req.toLowerCase());
	}
	return drop;
}

function pruneRequirements(raw, drop) {
	if (drop.size === 0) return { raw, removed: 0 };
	let removed = 0;
	const kept = raw.split(/\r?\n/).filter((line) => {
		const name = line.trim().split(/[=<>!~\[; ]/)[0].toLowerCase();
		if (name && drop.has(name)) {
			removed++;
			return false;
		}
		return true;
	});
	return { raw: kept.join('\n'), removed };
}

function prunePackageJson(raw, prune) {
	let pkg;
	try {
		pkg = JSON.parse(raw);
	} catch {
		// Not valid JSON after substitution — leave it and let the caller notice.
		return { raw, removed: 0 };
	}
	const indent = detectIndent(raw);
	let removed = 0;
	for (const key of ['dependencies', 'devDependencies', 'scripts']) {
		if (!pkg[key]) continue;
		for (const entry of prune[key]) {
			if (entry in pkg[key]) {
				delete pkg[key][entry];
				removed++;
			}
		}
		if (Object.keys(pkg[key]).length === 0) delete pkg[key];
	}
	return { raw: JSON.stringify(pkg, null, indent) + '\n', removed };
}

export function generate(manifest, target, options) {
	const { dryRun = false, force = false } = options;
	const enabled = resolveFeatures(manifest, options);
	const ctx = buildContext({
		name: options.name,
		scope: options.scope,
		description: options.description,
		port: options.port ?? manifest.defaults?.port,
		author: options.author
	});

	const filesDir = manifest.__filesDir;
	if (!fs.existsSync(filesDir)) {
		throw new Error(
			`Template "${manifest.name}" has no files/ directory yet. ` +
				`Run: stack extract ${manifest.name}`
		);
	}

	if (!dryRun && fs.existsSync(target) && fs.readdirSync(target).length > 0 && !force) {
		throw new Error(
			`Target ${target} is not empty. Pass --force to write into it anyway.`
		);
	}

	// A file owned by any disabled feature is dropped wholesale.
	const dropMatchers = [];
	for (const [name, def] of Object.entries(manifest.features)) {
		if (enabled.has(name)) continue;
		if (def.files?.length) dropMatchers.push(matcher(def.files));
	}
	const isDropped = (rel) => dropMatchers.some((m) => m(rel));

	const replacements = compileReplacements(manifest.replacements, ctx);
	const pathReplacements = compileReplacements(manifest.pathReplacements, ctx);
	const prunes = collectPrunes(manifest, enabled);
	const requirementPrunes = collectRequirementPrunes(manifest, enabled);

	const all = walk(filesDir, { skipDirs: DEFAULT_SKIP_DIRS });
	const report = {
		enabled: [...enabled].sort(),
		disabled: Object.keys(manifest.features).filter((f) => !enabled.has(f)).sort(),
		written: [],
		dropped: [],
		pruned: 0
	};

	for (const rel of all) {
		if (isDropped(rel)) {
			report.dropped.push(rel);
			continue;
		}

		let destRel = applyReplacements(rel, pathReplacements, enabled, evalExpr);
		destRel = interpolate(destRel, ctx);
		// `.gitignore` cannot ship inside a template dir that is itself
		// git-tracked without being honoured, so templates store it renamed.
		destRel = destRel.replace(/(^|\/)_gitignore$/, '$1.gitignore');
		destRel = destRel.replace(/(^|\/)_npmrc$/, '$1.npmrc');

		const from = path.join(filesDir, rel);
		const to = path.join(target, destRel);

		if (!isTextFile(rel)) {
			if (!dryRun) copyBinary(from, to);
			report.written.push(destRel);
			continue;
		}

		let content = readText(from);
		const stripped = stripFeatures(content, enabled);
		content = stripped.content;
		content = applyReplacements(content, replacements, enabled, evalExpr);

		const prune = prunes.get(destRel);
		if (prune && path.basename(destRel) === 'package.json') {
			const result = prunePackageJson(content, prune);
			content = result.raw;
			report.pruned += result.removed;
		}

		if (path.basename(destRel) === 'requirements.txt') {
			const result = pruneRequirements(content, requirementPrunes);
			content = result.raw;
			report.pruned += result.removed;
		}

		if (!dryRun) writeText(to, content);
		report.written.push(destRel);
	}

	if (!dryRun) {
		writeText(
			path.join(target, 'stack.json'),
			JSON.stringify(
				{
					template: manifest.name,
					templateVersion: manifest.version || '0.1.0',
					generatedAt: new Date().toISOString(),
					name: ctx.name,
					scope: ctx.scope,
					features: report.enabled
				},
				null,
				'\t'
			) + '\n'
		);
	}

	return { report, ctx, enabled };
}
