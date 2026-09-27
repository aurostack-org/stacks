// Checks every internal link in the built site: each href and src resolves to
// a file in dist/, and each #fragment to an id on the target page. It works on
// the output, so relative links, component-rendered links and a different base
// path (a private build) are all covered.
//
//   node scripts/check-links.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const base = (process.env.DOCS_BASE ?? '/').replace(/\/$/, '');

function* htmlFiles(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* htmlFiles(full);
		else if (entry.name.endsWith('.html')) yield full;
	}
}

// URL path of a built file: dist/a/b/index.html -> <base>/a/b/
const urlOf = (file) => {
	const rel = path.relative(dist, file).split(path.sep).join('/');
	return `${base}/${rel.replace(/(^|\/)index\.html$/, '$1')}`;
};

// File for a URL path, or null if it isn't part of this site.
const fileOf = (pathname) => {
	if (!pathname.startsWith(`${base}/`) && pathname !== base) return null;
	let rel = decodeURIComponent(pathname.slice(base.length)).replace(/^\//, '');
	if (rel === '' || rel.endsWith('/')) rel += 'index.html';
	return path.join(dist, rel);
};

const idCache = new Map();
const idsOf = (file) => {
	if (!idCache.has(file)) {
		const html = fs.readFileSync(file, 'utf8');
		idCache.set(file, new Set([...html.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((m) => m[1])));
	}
	return idCache.get(file);
};

const problems = [];
let checked = 0;
for (const file of htmlFiles(dist)) {
	// Archify diagrams are standalone apps with their own internal anchors.
	if (file.includes(`${path.sep}diagrams${path.sep}`)) continue;
	const html = fs.readFileSync(file, 'utf8');
	const pageUrl = new URL(urlOf(file), 'https://site.invalid');
	for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
		const value = raw.replace(/&amp;/g, '&');
		if (!value || /^(https?:|mailto:|tel:|data:|javascript:)/.test(value)) continue;
		const url = new URL(value, pageUrl);
		if (url.origin !== pageUrl.origin) continue;
		checked++;
		const target = fileOf(url.pathname);
		if (!target) {
			problems.push(`${urlOf(file)}: ${attr} "${value}" points outside ${base}/`);
			continue;
		}
		if (!fs.existsSync(target)) {
			problems.push(`${urlOf(file)}: ${attr} "${value}" → missing ${url.pathname}`);
			continue;
		}
		const hash = decodeURIComponent(url.hash.slice(1));
		if (hash && hash !== '_top' && target.endsWith('.html') && !idsOf(target).has(hash)) {
			problems.push(`${urlOf(file)}: "${value}" → no #${hash} on ${url.pathname}`);
		}
	}
}

if (problems.length) {
	console.error(`${problems.length} broken internal link(s):`);
	for (const p of [...new Set(problems)]) console.error(`  ${p}`);
	process.exit(1);
}
console.log(`links: ${checked} internal links, all resolve`);
