/**
 * Feature-region stripping.
 *
 * Templates are *subtractive*: `templates/<name>/files` is a complete, runnable
 * app with every optional feature switched on, annotated so the generator can
 * delete the parts you did not ask for. That keeps the template itself
 * installable and testable, which a pile of additive fragments never is.
 *
 * Three marker forms, comment-syntax agnostic (we look for the marker text
 * anywhere on the line, so `//`, `#`, `<!-- -->` and `/* *\/` all work):
 *
 *   // @feature:start realtime
 *   ...kept only when `realtime` is on...
 *   // @feature:else
 *   ...kept only when it is off...
 *   // @feature:end
 *
 *   import { Gateway } from 'realtime'; // @feature realtime
 *
 * The expression is a comma/space separated list OR'd together, where a leading
 * `!` negates: `@feature:start realtime, notifications` keeps the block if
 * either is on; `@feature:start !realtime` keeps it only when realtime is off.
 *
 * Strict JSON cannot carry comments, so package.json is pruned through the
 * manifest's per-feature `packageJson` lists instead — see `prunePackageJson`
 * in generate.mjs. JSONC files (tsconfig.json) take markers like any other.
 */

const START = /@feature:start\b/;
const ELSE = /@feature:else\b/;
const END = /@feature:end\b/;
const INLINE = /@feature\b/;

const COMMENT_LEADERS = ['<!--', '/*', '//', '#', '--', ';'];

/** Evaluate `realtime, !media` against the enabled set. */
export function evalExpr(expr, enabled) {
	const terms = expr
		.split(/[,\s]+/)
		.map((t) => t.trim())
		.filter(Boolean);
	if (terms.length === 0) return true;
	return terms.some((term) =>
		term.startsWith('!') ? !enabled.has(term.slice(1)) : enabled.has(term)
	);
}

function readExpr(line, marker) {
	const idx = line.search(marker);
	let rest = line.slice(idx).replace(marker, '');
	// Trim a trailing block-comment / HTML close so `<!-- @feature:start x -->`
	// does not leak `-->` into the expression.
	rest = rest.replace(/(-->|\*\/)\s*$/, '');
	return rest.trim();
}

/** Remove the trailing marker comment from a line we are keeping. */
function stripInlineMarker(line) {
	const at = line.indexOf('@feature');
	if (at === -1) return line;
	let cut = -1;
	for (const leader of COMMENT_LEADERS) {
		const idx = line.lastIndexOf(leader, at);
		if (idx !== -1 && idx > cut) cut = idx;
	}
	if (cut === -1) return line;
	const kept = line.slice(0, cut).replace(/\s+$/, '');
	return kept;
}

/**
 * @returns {{ content: string, changed: boolean, markers: number }}
 */
export function stripFeatures(content, enabled) {
	if (!content.includes('@feature')) {
		return { content, changed: false, markers: 0 };
	}

	const eol = content.includes('\r\n') ? '\r\n' : '\n';
	const lines = content.split(/\r?\n/);
	const out = [];
	/** @type {{ keep: boolean, seenElse: boolean, parentKeep: boolean }[]} */
	const stack = [];
	let markers = 0;

	const emitting = () => stack.every((f) => f.keep);

	for (const line of lines) {
		if (START.test(line)) {
			markers++;
			const parentKeep = emitting();
			const keep = parentKeep && evalExpr(readExpr(line, START), enabled);
			stack.push({ keep, seenElse: false, parentKeep });
			continue;
		}

		if (ELSE.test(line)) {
			markers++;
			const frame = stack[stack.length - 1];
			if (!frame) continue; // unbalanced; ignore rather than corrupt the file
			frame.seenElse = true;
			frame.keep = frame.parentKeep && !frame.keep;
			continue;
		}

		if (END.test(line)) {
			markers++;
			stack.pop();
			continue;
		}

		if (!emitting()) continue;

		if (INLINE.test(line)) {
			markers++;
			if (!evalExpr(readExpr(line, INLINE), enabled)) continue;
			const kept = stripInlineMarker(line);
			// A line that was *only* a marker comment leaves nothing behind.
			if (kept.trim() === '') continue;
			out.push(kept);
			continue;
		}

		out.push(line);
	}

	// Deleting blocks leaves ragged gaps; collapse runs of 3+ blank lines.
	let result = out.join(eol).replace(/(\r?\n[ \t]*){3,}/g, `${eol}${eol}`);
	// A block at the end of a file leaves blank lines before EOF, which every
	// formatter then wants to remove — enough on its own to fail a `format:check`
	// step in the generated project's CI.
	result = result.replace(/(\r?\n[ \t]*)+$/, '');
	if (!result.endsWith(eol)) result += eol;

	return { content: result, changed: result !== content, markers };
}

/**
 * Collect every feature name referenced by markers in a file, so `stack doctor`
 * can flag markers for features the manifest never declares (a typo'd
 * `@feature realtimee` silently deletes code otherwise).
 */
export function collectFeatureNames(content) {
	const names = new Set();
	if (!content.includes('@feature')) return names;
	for (const line of content.split(/\r?\n/)) {
		let expr = null;
		if (START.test(line)) expr = readExpr(line, START);
		else if (ELSE.test(line) || END.test(line)) continue;
		else if (INLINE.test(line)) expr = readExpr(line, INLINE);
		if (!expr) continue;
		for (const term of expr.split(/[,\s]+/)) {
			const clean = term.replace(/^!/, '').trim();
			if (clean) names.add(clean);
		}
	}
	return names;
}

/**
 * Count net bracket depth, ignoring strings and comments.
 *
 * Used by `stack doctor` to catch the sharpest edge of the marker syntax: an
 * inline `// @feature x` placed on the *closing* line of a multi-line construct
 * deletes only that line, silently leaving a half-open import or object. The
 * template compiles (every feature is on), so nothing catches it until someone
 * generates a project without that feature.
 */
export function bracketBalance(code) {
	let depth = 0;
	let i = 0;
	const n = code.length;
	while (i < n) {
		const ch = code[i];
		const next = code[i + 1];

		if (ch === '/' && next === '/') {
			while (i < n && code[i] !== '\n') i++;
			continue;
		}
		if (ch === '/' && next === '*') {
			i += 2;
			while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
			i += 2;
			continue;
		}
		if (ch === "'" || ch === '"' || ch === '`') {
			const quote = ch;
			i++;
			while (i < n) {
				if (code[i] === '\\') {
					i += 2;
					continue;
				}
				// A template literal's ${...} is code again, but its braces are
				// balanced within the literal, so skipping the whole span is safe.
				if (code[i] === quote) break;
				i++;
			}
			i++;
			continue;
		}
		if (ch === '{' || ch === '(' || ch === '[') depth++;
		else if (ch === '}' || ch === ')' || ch === ']') depth--;
		i++;
	}
	return depth;
}
