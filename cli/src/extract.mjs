/**
 * Extraction: a live codebase -> templates/<t>/files.
 *
 * This is the *maintenance* direction. It is deliberately mechanical — it
 * copies whatever the manifest's include/exclude globs say and nothing more.
 * Deciding which files are generic infrastructure and which are domain code is
 * judgement work; that judgement is recorded in the template's source config
 * (stacks.local.json, see `sourceConfig`) and refined by the /stack-sync skill,
 * not re-derived on every run. The config's `replacements` map the source's
 * own identifiers onto the template's (e.g. its product name onto `Acme Corp`)
 * as text files come in, so a refresh never reintroduces them.
 *
 * Extraction never deletes hand-written template files that the source does not
 * have — `@feature` annotations added to a composition root would be lost
 * otherwise. Files that already exist in the template are reported as
 * "conflicts" and skipped unless --overwrite is passed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
	walk,
	matcher,
	isTextFile,
	readText,
	writeText,
	copyBinary,
	DEFAULT_SKIP_DIRS,
	exists
} from './fsx.mjs';
import { expandHome } from './manifest.mjs';

export function extract(
	manifest,
	{ source, config = {}, overwrite = false, dryRun = false, prune = false }
) {
	const src = expandHome(source || config.path);
	const translate = (text) =>
		(config.replacements || []).reduce(
			(out, { from, to }) => out.split(from).join(to),
			text
		);
	if (!src) {
		// A template with `derivedFrom` is maintained from another template rather
		// than from a live repo, so pointing extract at a source directory is not
		// the fix — sending someone to `--source` would have them overwrite a
		// derived tree with unflattened files.
		if (manifest.derivedFrom) {
			throw new Error(
				`Template "${manifest.name}" is derived from "${manifest.derivedFrom}", not extracted from a repo.\n` +
					`Edit "${manifest.derivedFrom}" instead, then run:\n` +
					`  bash templates/${manifest.name}/derive.sh`
			);
		}
		throw new Error(
			`No source path for "${manifest.name}": add it to stacks.local.json or pass --source <dir>.`
		);
	}
	if (!exists(src)) {
		throw new Error(`Source directory does not exist: ${src}`);
	}

	const include = matcher(config.include || ['**']);
	const exclude = matcher(config.exclude || []);
	const filesDir = manifest.__filesDir;

	const candidates = walk(src, {
		skipDirs: [...DEFAULT_SKIP_DIRS, ...(config.skipDirs || [])]
	});

	const report = { copied: [], conflicts: [], skipped: 0, orphans: [] };

	for (const rel of candidates) {
		if (!include(rel) || exclude(rel)) {
			report.skipped++;
			continue;
		}

		// Dotfiles that would be swallowed by the parent repo's ignore rules are
		// stored under an underscore alias and restored at generation time.
		let destRel = rel
			.replace(/(^|\/)\.gitignore$/, '$1_gitignore')
			.replace(/(^|\/)\.npmrc$/, '$1_npmrc');

		const from = path.join(src, rel);
		const to = path.join(filesDir, destRel);

		if (exists(to) && !overwrite) {
			// Only flag a genuine difference — an identical file is not a conflict.
			const same = isTextFile(rel)
				? readText(to) === translate(readText(from))
				: fs.readFileSync(to).equals(fs.readFileSync(from));
			if (!same) report.conflicts.push(destRel);
			else report.skipped++;
			continue;
		}

		if (!dryRun) {
			if (isTextFile(rel)) writeText(to, translate(readText(from)));
			else copyBinary(from, to);
		}
		report.copied.push(destRel);
	}

	// Files in the template that the source no longer produces.
	//
	// Only files the include/exclude globs actually *claim* can be orphans.
	// Anything hand-authored outside that set — a template-only seeder, a
	// .env.example that must never be copied from a real repo — is invisible to
	// --prune by construction, so refreshing a template can never delete work
	// that extraction was never responsible for.
	if (exists(filesDir)) {
		const templated = walk(filesDir, { skipDirs: DEFAULT_SKIP_DIRS });
		const denorm = (rel) =>
			rel
				.replace(/(^|\/)_gitignore$/, '$1.gitignore')
				.replace(/(^|\/)_npmrc$/, '$1.npmrc');
		const sourceSet = new Set(
			candidates
				.filter((rel) => include(rel) && !exclude(rel))
				.map((rel) =>
					rel
						.replace(/(^|\/)\.gitignore$/, '$1_gitignore')
						.replace(/(^|\/)\.npmrc$/, '$1_npmrc')
				)
		);
		for (const rel of templated) {
			if (sourceSet.has(rel)) continue;
			const original = denorm(rel);
			// Claimed by the globs but absent from the source → genuinely stale.
			if (include(original) && !exclude(original)) report.orphans.push(rel);
		}
	}

	if (prune && !dryRun) {
		for (const rel of report.orphans) {
			fs.rmSync(path.join(filesDir, rel), { force: true });
		}
		pruneEmptyDirs(filesDir);
	}

	return report;
}

/** Remove directories left empty by --prune, bottom-up. */
function pruneEmptyDirs(root) {
	const rec = (dir) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return true;
		}
		let empty = true;
		for (const entry of entries) {
			if (entry.isDirectory()) {
				if (!rec(path.join(dir, entry.name))) empty = false;
			} else {
				empty = false;
			}
		}
		if (empty && dir !== root) fs.rmdirSync(dir);
		return empty;
	};
	rec(root);
}
