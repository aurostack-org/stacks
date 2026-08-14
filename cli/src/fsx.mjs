/**
 * Filesystem + glob helpers. No dependencies — this CLI must run from a bare
 * checkout of ~/.claude with nothing installed.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Translate a glob to a RegExp. Supports `**` (any depth, including zero
 * segments), `*` (within a segment), `?`, `{a,b}` alternation and `[abc]`
 * classes. Paths are matched with forward slashes, relative and un-prefixed.
 */
export function globToRegExp(glob) {
	let out = '';
	let i = 0;
	let inClass = false;

	while (i < glob.length) {
		const c = glob[i];

		if (inClass) {
			if (c === ']') inClass = false;
			out += c === '\\' ? '\\\\' : c;
			i++;
			continue;
		}

		switch (c) {
			case '[':
				inClass = true;
				out += '[';
				i++;
				break;
			case '{':
				out += '(?:';
				i++;
				break;
			case '}':
				out += ')';
				i++;
				break;
			case ',':
				out += '|';
				i++;
				break;
			case '?':
				out += '[^/]';
				i++;
				break;
			case '*': {
				const isGlobstar = glob[i + 1] === '*';
				if (!isGlobstar) {
					out += '[^/]*';
					i++;
					break;
				}
				// `a/**/b` must also match `a/b`, so swallow the trailing slash
				// into the optional group rather than leaving it mandatory.
				if (glob[i + 2] === '/') {
					out += '(?:.*/)?';
					i += 3;
				} else {
					out += '.*';
					i += 2;
				}
				break;
			}
			default:
				out += /[.+^$()|\\]/.test(c) ? `\\${c}` : c;
				i++;
		}
	}

	return new RegExp(`^${out}$`);
}

/** Compile a list of globs into a single predicate. Empty list → never matches. */
export function matcher(globs) {
	if (!globs || globs.length === 0) return () => false;
	const res = globs.map(globToRegExp);
	// A directory glob like `src/common` should also claim everything under it,
	// which is what people mean when they list a bare directory.
	const prefixes = globs
		.filter((g) => !/[*?{[]/.test(g))
		.map((g) => g.replace(/\/$/, '') + '/');
	return (rel) =>
		res.some((re) => re.test(rel)) || prefixes.some((p) => rel.startsWith(p));
}

/**
 * Walk `root` and return repo-relative POSIX paths of every file.
 * `skipDirs` short-circuits whole subtrees (node_modules and friends) so we
 * never pay to descend into them.
 */
export function walk(root, { skipDirs = [] } = {}) {
	const skip = new Set(skipDirs);
	const out = [];

	const rec = (dir, rel) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const childRel = rel ? `${rel}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				if (skip.has(entry.name)) continue;
				rec(path.join(dir, entry.name), childRel);
			} else if (entry.isFile() || entry.isSymbolicLink()) {
				out.push(childRel);
			}
		}
	};

	rec(root, '');
	return out.sort();
}

export const DEFAULT_SKIP_DIRS = [
	'node_modules',
	'.git',
	'.turbo',
	'dist',
	'build',
	'coverage',
	'.next',
	'.cache',
	'__pycache__',
	'.venv',
	'venv',
	'.react-email',
	'dev-dist',
	'.yarn',
	'generated',
	'.pytest_cache'
];

const TEXT_EXT = new Set([
	'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
	'.json', '.jsonc', '.json5', '.yml', '.yaml', '.toml', '.ini',
	'.md', '.mdx', '.txt', '.html', '.htm', '.xml', '.svg',
	'.css', '.scss', '.less', '.prisma', '.graphql', '.gql',
	'.sh', '.bash', '.zsh', '.py', '.rb', '.sql', '.dbml',
	'.env', '.example', '.gitignore', '.dockerignore', '.editorconfig',
	'.npmrc', '.nvmrc', '.prettierrc', '.eslintrc', '.lock', '.alloy'
]);

const TEXT_BASENAME = new Set([
	'Dockerfile', 'Dockerfile.dev', 'Makefile', 'LICENSE', 'README',
	'.gitignore', '.dockerignore', '.editorconfig', '.npmrc', '.nvmrc',
	'.env', '.prettierrc', '.prettierignore', '.eslintrc', '.watchmanconfig',
	'.yarnrc.yml', '.swcrc', '.gitmodules', '.gitkeep'
]);

/** Heuristic: is this file safe to read as UTF-8 and rewrite? */
export function isTextFile(rel) {
	const base = path.basename(rel);
	if (TEXT_BASENAME.has(base)) return true;
	if (base.startsWith('.env')) return true;
	if (base.startsWith('Dockerfile')) return true;
	const ext = path.extname(base).toLowerCase();
	return TEXT_EXT.has(ext);
}

export function readText(file) {
	return fs.readFileSync(file, 'utf8');
}

export function writeText(file, content) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content, 'utf8');
}

export function copyBinary(from, to) {
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(from, to);
}

export function exists(p) {
	try {
		fs.accessSync(p);
		return true;
	} catch {
		return false;
	}
}

export function isDirEmpty(dir) {
	if (!exists(dir)) return true;
	return fs.readdirSync(dir).length === 0;
}

export function rmrf(dir) {
	fs.rmSync(dir, { recursive: true, force: true });
}
