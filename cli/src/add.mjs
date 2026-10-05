/**
 * Add optional features to a project the templates already generated.
 *
 * A three-way merge with the template as the common ancestor. The template is
 * generated twice into a scratch directory with the project's own name, scope
 * and port: once with the features the project has (A), once with the new
 * ones as well (B). A → B is exactly what the features change in the current
 * template, and that change is merged into the project with `git merge-file`,
 * so the project's own edits, and template drift since it was generated, both
 * survive. Only hunks that genuinely overlap come back as conflicts.
 *
 * Both copies are formatted with the project's Prettier first. Generation ends
 * with a format hook, so an unformatted ancestor would disagree with the
 * project on every stripped line and turn the merge into noise.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { generate } from './generate.mjs';
import { resolveFeatures } from './manifest.mjs';
import { walk, isTextFile, readText, writeText, copyBinary, rmrf, DEFAULT_SKIP_DIRS } from './fsx.mjs';

/** The features the project has, closed over requirements, plus the new ones. */
function selection(manifest, have, add) {
	const known = new Set(Object.keys(manifest.features));
	const unknown = add.filter((f) => !known.has(f));
	if (unknown.length) {
		throw new Error(
			`Unknown feature${unknown.length > 1 ? 's' : ''} ${unknown.map((f) => `"${f}"`).join(', ')} ` +
				`for template "${manifest.name}". Known: ${[...known].sort().join(', ')}`
		);
	}
	// A feature the template has since dropped cannot be regenerated; ignore it.
	const base = have.filter((f) => known.has(f));
	const wanted = new Set([...base, ...add]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const name of [...wanted]) {
			for (const dep of manifest.features[name].requires || []) {
				if (!wanted.has(dep)) {
					wanted.add(dep);
					grew = true;
				}
			}
		}
	}
	const optionsFor = (set) => ({
		with: [...set],
		without: [...known].filter((f) => !set.has(f) && !manifest.features[f].core)
	});
	return {
		before: optionsFor(new Set(base)),
		after: optionsFor(wanted),
		added: [...wanted].filter((f) => !base.includes(f)).sort()
	};
}

function git(args, cwd) {
	return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

/** Refuse a dirty tree, so the addition is one reviewable diff that `git checkout .` undoes. */
function assertClean(dir) {
	const res = git(['status', '--porcelain'], dir);
	if (res.error || res.status !== 0) {
		throw new Error(
			`${dir} is not a git repository. stack add needs one so the change can be reviewed and undone; ` +
				'pass --force to write anyway.'
		);
	}
	if (res.stdout.trim()) {
		throw new Error(
			`${dir} has uncommitted changes. Commit or stash them first, so the feature lands as its own diff; ` +
				'pass --force to merge into them anyway.'
		);
	}
}

/**
 * Format a scratch copy the way the generated project was formatted: its own
 * `format` script, run with the project's Prettier and plugins (linked in).
 */
function formatLike(project, dir) {
	const pkgFile = path.join(dir, 'package.json');
	const modules = path.join(project, 'node_modules');
	const prettier = path.join(modules, '.bin', 'prettier');
	// A template without a Prettier format script was never formatted after
	// generation, so its raw output is already what the project has.
	if (!fs.existsSync(pkgFile)) return true;
	const script = JSON.parse(readText(pkgFile)).scripts?.format;
	if (!script || !/^prettier\s/.test(script)) return true;
	if (!fs.existsSync(prettier)) return false;
	fs.symlinkSync(modules, path.join(dir, 'node_modules'), 'dir');
	const res = spawnSync(`"${prettier}" ${script.replace(/^prettier\s+/, '')}`, {
		cwd: dir,
		shell: true,
		encoding: 'utf8'
	});
	fs.unlinkSync(path.join(dir, 'node_modules'));
	return res.status === 0;
}

function detectIndent(raw) {
	const m = raw.match(/^([ \t]+)"/m);
	return m ? m[1] : '\t';
}

/**
 * package.json is merged by key rather than by line: dependency maps are
 * sorted, so a new key lands mid-block and a line merge would conflict with any
 * dependency the project added nearby.
 */
function mergePackageJson(projectRaw, beforeRaw, afterRaw) {
	const project = JSON.parse(projectRaw);
	const before = JSON.parse(beforeRaw);
	const after = JSON.parse(afterRaw);
	const conflicts = [];
	const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

	const mergeLevel = (target, a, b, at) => {
		for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
			const where = at ? `${at}.${key}` : key;
			if (same(a[key], b[key])) continue;
			const isMap = (v) => v && typeof v === 'object' && !Array.isArray(v);
			if (isMap(a[key]) && isMap(b[key]) && isMap(target[key])) {
				mergeLevel(target[key], a[key], b[key], where);
				continue;
			}
			if (!(key in b)) {
				if (same(target[key], a[key])) delete target[key];
				else if (key in target) conflicts.push(`${where} (the feature removes it; yours differs, kept)`);
			} else if (!(key in target) || same(target[key], a[key])) {
				target[key] = b[key];
			} else if (!same(target[key], b[key])) {
				conflicts.push(`${where} (template wants ${JSON.stringify(b[key])}; yours kept)`);
			}
		}
	};
	mergeLevel(project, before, after, '');

	for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
		if (!project[field]) continue;
		project[field] = Object.fromEntries(
			Object.entries(project[field]).sort(([x], [y]) => x.localeCompare(y))
		);
	}
	return {
		content: JSON.stringify(project, null, detectIndent(projectRaw)) + '\n',
		conflicts
	};
}

/** Keys `.env.example` gains, so a seeded `.env` gets the same placeholders. */
function envKeys(raw) {
	const keys = new Map();
	for (const line of raw.split('\n')) {
		const m = line.match(/^([A-Z][A-Z0-9_]*)=/);
		if (m) keys.set(m[1], line);
	}
	return keys;
}

export function addFeatures(manifest, project, options) {
	const { features, toolVersion, dryRun = false, force = false } = options;

	const stackFile = path.join(project, 'stack.json');
	if (!fs.existsSync(stackFile)) {
		throw new Error(`${project} has no stack.json: it was not generated by stack, so there is nothing to merge against.`);
	}
	const stack = JSON.parse(readText(stackFile));
	if (stack.template !== manifest.name) {
		throw new Error(`${project} was generated from "${stack.template}", not "${manifest.name}".`);
	}

	const already = features.filter((f) => stack.features.includes(f));
	const { before, after, added } = selection(
		manifest,
		stack.features,
		features.filter((f) => !already.includes(f))
	);
	// Validate both selections the same way `stack new` would.
	resolveFeatures(manifest, before);
	resolveFeatures(manifest, after);

	const report = {
		added,
		already,
		written: [],
		merged: [],
		conflicts: [],
		removed: [],
		kept: [],
		envKeys: [],
		formatted: false
	};
	if (added.length === 0) return report;

	if (!dryRun && !force) assertClean(project);

	const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-add-'));
	try {
		const ctxOptions = {
			name: stack.name,
			scope: stack.scope,
			description: stack.description,
			port: stack.port,
			author: stack.author,
			toolVersion
		};
		const dirA = path.join(scratch, 'before');
		const dirB = path.join(scratch, 'after');
		generate(manifest, dirA, { ...ctxOptions, ...before });
		generate(manifest, dirB, { ...ctxOptions, ...after });
		const fa = formatLike(project, dirA);
		const fb = formatLike(project, dirB);
		report.formatted = fa && fb;

		const filesA = new Set(walk(dirA, { skipDirs: DEFAULT_SKIP_DIRS }));
		const filesB = new Set(walk(dirB, { skipDirs: DEFAULT_SKIP_DIRS }));
		const all = [...new Set([...filesA, ...filesB])].filter((rel) => rel !== 'stack.json').sort();

		for (const rel of all) {
			const a = path.join(dirA, rel);
			const b = path.join(dirB, rel);
			const p = path.join(project, rel);
			const inA = filesA.has(rel);
			const inB = filesB.has(rel);
			const inP = fs.existsSync(p);
			const bytes = (f) => fs.readFileSync(f);

			if (inA && inB && bytes(a).equals(bytes(b))) continue;

			if (!inA) {
				// A file the new features bring.
				if (!inP) {
					if (!dryRun) isTextFile(rel) ? writeText(p, readText(b)) : copyBinary(b, p);
					report.written.push(rel);
				} else if (!bytes(p).equals(bytes(b))) {
					report.conflicts.push(`${rel} (new from the template, but you already have a different one: yours kept)`);
				}
				continue;
			}

			if (!inB) {
				// A file only a project without these features has (an @feature:else branch).
				if (!inP) continue;
				if (bytes(p).equals(bytes(a))) {
					if (!dryRun) fs.rmSync(p);
					report.removed.push(rel);
				} else {
					report.kept.push(`${rel} (the template drops it with these features; you changed it, so it stays)`);
				}
				continue;
			}

			if (!inP) {
				report.kept.push(`${rel} (changed by the features, but you deleted it: not recreated)`);
				continue;
			}

			if (!isTextFile(rel)) {
				report.conflicts.push(`${rel} (binary, changed by the features: yours kept)`);
				continue;
			}

			if (path.basename(rel) === 'package.json') {
				const merged = mergePackageJson(readText(p), readText(a), readText(b));
				if (!dryRun) writeText(p, merged.content);
				report.merged.push(rel);
				for (const c of merged.conflicts) report.conflicts.push(`${rel}: ${c}`);
				continue;
			}

			const res = git(
				['merge-file', '-p', '-L', 'yours', '-L', 'template', '-L', `with ${added.join(', ')}`, p, a, b],
				project
			);
			if (res.error) throw new Error(`git merge-file failed: ${res.error.message}`);
			if (res.status < 0 || res.status > 127) {
				throw new Error(`git merge-file failed on ${rel}: ${res.stderr}`);
			}
			if (!dryRun) writeText(p, res.stdout);
			if (res.status === 0) report.merged.push(rel);
			else report.conflicts.push(`${rel} (${res.status} conflicting hunk${res.status > 1 ? 's' : ''}, marked in the file)`);
		}

		// `.env` is not in the template, only `.env.example`: give it the new keys too.
		for (const rel of all.filter((r) => path.basename(r) === '.env.example')) {
			const before = filesA.has(rel) ? envKeys(readText(path.join(dirA, rel))) : new Map();
			const after = envKeys(readText(path.join(dirB, rel)));
			const env = path.join(project, path.dirname(rel), '.env');
			if (!fs.existsSync(env)) continue;
			const present = envKeys(readText(env));
			const missing = [...after].filter(([k]) => !before.has(k) && !present.has(k));
			if (missing.length === 0) continue;
			report.envKeys.push(...missing.map(([k]) => k));
			if (!dryRun) {
				const raw = readText(env);
				const lines = missing.map(([, line]) => line).join('\n');
				writeText(env, `${raw.replace(/\n*$/, '\n')}\n# Added by stack add ${added.join(', ')}\n${lines}\n`);
			}
		}
	} finally {
		rmrf(scratch);
	}

	if (!dryRun) {
		const enabled = new Set([...stack.features, ...added]);
		writeText(
			stackFile,
			JSON.stringify(
				{
					...stack,
					templateVersion: manifest.version || stack.templateVersion,
					stackVersion: toolVersion,
					updatedAt: new Date().toISOString(),
					features: [...enabled].sort()
				},
				null,
				'\t'
			) + '\n'
		);
	}
	return report;
}
