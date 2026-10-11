#!/usr/bin/env node
/**
 * Re-derive the nest-monorepo template from nest-api and node-worker.
 *
 * nest-monorepo is the same two stacks laid out as one Turborepo + Yarn 4
 * workspace, sharing one Prisma package instead of the worker keeping a copy of
 * the API's schema. The app code is *identical source*, so rather than maintain
 * a third copy by hand, this script rebuilds files/ from the two templates:
 *
 *   nest-api/files/**                   ->  apps/api/**
 *   nest-api/files/prisma/schema/**     ->  packages/db/prisma/schema/**
 *   nest-api/files/compose*.yml         ->  compose*.yml (shared by every app)
 *   node-worker/files/**                ->  apps/worker/**
 *
 * then rewrites what the move changes (Prisma imports, package.json, the db and
 * compose scripts, the guidance that names those paths), and copies overrides/
 * on top: the root workspace files, packages/db, both Dockerfiles and the root
 * CI. The divergence from the source templates is therefore this script plus
 * one directory listing.
 *
 * template.json is generated too: manifest.base.json supplies the top-level
 * fields and the monorepo's own features, and every feature of the two source
 * templates is carried over with its paths moved under apps/ (the worker's
 * renamed where they would collide: queue -> worker-queue, browser ->
 * worker-browser, pm2 -> worker-pm2, telemetry -> observability).
 *
 * Every text patch names the exact text it expects and fails loudly when that
 * text has moved, so an upstream edit can never be silently skipped.
 *
 * Usage:  bash templates/nest-monorepo/derive.sh
 *         stack doctor nest-monorepo          # always, afterwards
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = path.resolve(HERE, '..');
const API_SRC = path.join(TEMPLATES, 'nest-api');
const WORKER_SRC = path.join(TEMPLATES, 'node-worker');
const DST = path.join(HERE, 'files');
const OVERRIDES = path.join(HERE, 'overrides');

const SKIP = new Set(['node_modules', 'dist', '.turbo', 'logs', 'coverage']);

// ---------------------------------------------------------------- helpers

const abs = (rel) => path.join(DST, rel);
const exists = (rel) => fs.existsSync(abs(rel));
const read = (rel) => fs.readFileSync(abs(rel), 'utf8');
const write = (rel, text) => {
	fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
	fs.writeFileSync(abs(rel), text);
};
const rm = (rel) => fs.rmSync(abs(rel), { recursive: true, force: true });

function copyTree(from, to) {
	for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
		if (SKIP.has(entry.name)) continue;
		const src = path.join(from, entry.name);
		const dst = path.join(to, entry.name);
		if (entry.isDirectory()) {
			fs.mkdirSync(dst, { recursive: true });
			copyTree(src, dst);
		} else {
			fs.mkdirSync(path.dirname(dst), { recursive: true });
			fs.copyFileSync(src, dst);
		}
	}
}

function move(fromRel, toRel) {
	fs.mkdirSync(path.dirname(abs(toRel)), { recursive: true });
	fs.renameSync(abs(fromRel), abs(toRel));
}

/** Every file under `rel`, as paths relative to files/. */
function filesUnder(rel) {
	const out = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(abs(dir), { withFileTypes: true })) {
			const child = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(child);
			else out.push(child);
		}
	};
	walk(rel);
	return out;
}

const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|ya?ml|prisma|toml|txt)$|(^|\/)(Dockerfile[^/]*|_gitignore|\.[a-z.]+)$/;

/**
 * Exact-text patches. Each pair must match: a source template that rewords the
 * anchor makes the derive fail here instead of shipping a half-patched file.
 */
function patch(rel, pairs) {
	let text = read(rel);
	for (const [from, to] of pairs) {
		if (!text.includes(from)) {
			throw new Error(`derive: anchor not found in ${rel}:\n---\n${from}\n---`);
		}
		text = text.split(from).join(to);
	}
	write(rel, text);
}

/** Replace from `start` (inclusive) up to `end` (exclusive). */
function patchRange(rel, start, end, replacement) {
	const text = read(rel);
	const a = text.indexOf(start);
	const b = text.indexOf(end, a);
	if (a === -1 || b === -1) {
		throw new Error(`derive: range not found in ${rel}: ${start} … ${end}`);
	}
	write(rel, text.slice(0, a) + replacement + text.slice(b));
}

/** Rewrite every text file under `rel` with a function, keeping untouched files as they are. */
function rewriteAll(rel, fn) {
	for (const file of filesUnder(rel)) {
		if (!TEXT.test(file)) continue;
		const before = read(file);
		const after = fn(before, file);
		if (after !== before) write(file, after);
	}
}

function editJson(rel, fn) {
	const raw = read(rel);
	const data = JSON.parse(raw);
	fn(data);
	write(rel, JSON.stringify(data, null, '\t') + '\n');
}

const sortKeys = (obj) =>
	Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));

/** The higher of two `^x.y.z` ranges, so the shared package takes the newer pin. */
function newer(a, b) {
	if (!a) return b;
	if (!b) return a;
	const parts = (v) => v.replace(/^[^\d]*/, '').split('.').map(Number);
	const [x, y] = [parts(a), parts(b)];
	for (let i = 0; i < 3; i++) {
		if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? a : b;
	}
	return a;
}

// ---------------------------------------------------------------- 1. copy

const apiManifest = JSON.parse(fs.readFileSync(path.join(API_SRC, 'template.json'), 'utf8'));
const workerManifest = JSON.parse(
	fs.readFileSync(path.join(WORKER_SRC, 'template.json'), 'utf8')
);
const apiPkg = JSON.parse(fs.readFileSync(path.join(API_SRC, 'files/package.json'), 'utf8'));
const workerPkg = JSON.parse(
	fs.readFileSync(path.join(WORKER_SRC, 'files/package.json'), 'utf8')
);

console.log('==> clearing files/');
fs.rmSync(DST, { recursive: true, force: true });
fs.mkdirSync(DST, { recursive: true });

console.log('==> copying nest-api -> apps/api, node-worker -> apps/worker');
copyTree(path.join(API_SRC, 'files'), abs('apps/api'));
copyTree(path.join(WORKER_SRC, 'files'), abs('apps/worker'));

// ---------------------------------------------------------------- 2. layout

console.log('==> moving Prisma into packages/db, compose to the root');
move('apps/api/prisma/schema', 'packages/db/prisma/schema');
rm('apps/api/prisma');
rm('apps/api/prisma.config.ts');
rm('apps/worker/prisma');
rm('apps/worker/prisma.config.ts');
// db.ts (its schema is packages/db's) and secrets.ts (the @aurostack/secrets
// CLI) were the only users of the worker's .bin helpers; nothing is left there.
rm('apps/worker/.bin');

move('apps/api/compose.yml', 'compose.yml');
move('apps/api/compose.test.yml', 'compose.test.yml');

// One copy of these at the root; the apps' own would only shadow it.
for (const app of ['apps/api', 'apps/worker']) {
	for (const f of ['.yarnrc.yml', '.nvmrc', '.forgejo', '.dockerignore']) rm(`${app}/${f}`);
}
fs.copyFileSync(path.join(WORKER_SRC, 'files/.yarnrc.yml'), abs('.yarnrc.yml'));
fs.copyFileSync(path.join(API_SRC, 'files/.nvmrc'), abs('.nvmrc'));
fs.copyFileSync(path.join(API_SRC, 'files/.prettierrc'), abs('.prettierrc'));

// ---------------------------------------------------------------- 3. packages/db

console.log('==> packages/db');
patch('packages/db/prisma/schema/base.prisma', [
	[
		'datasource db {',
		`// Datasource + generators. The models live in the other files in this folder.
//
// The client is generated as CommonJS and compiled to dist/ by \`yarn build\`, so
// every app imports the same build of it, CommonJS or ESM:
// \`import { PrismaClient } from '@acme/db/client'\`.

datasource db {`
	]
]);

write(
	'packages/db/package.json',
	JSON.stringify(
		{
			name: '@acme/db',
			version: '0.0.0',
			description:
				'Prisma schema, migrations and the generated client shared by every app',
			private: true,
			license: 'UNLICENSED',
			exports: {
				'./*': {
					types: './dist/*.d.ts',
					default: './dist/*.js'
				}
			},
			files: ['dist'],
			scripts: {
				generate: 'prisma generate',
				build: 'prisma generate && tsc -p tsconfig.json',
				prisma: 'prisma'
			},
			dependencies: {
				'@prisma/adapter-pg': newer(
					apiPkg.dependencies['@prisma/adapter-pg'],
					workerPkg.dependencies['@prisma/adapter-pg']
				),
				'@prisma/client': newer(
					apiPkg.dependencies['@prisma/client'],
					workerPkg.dependencies['@prisma/client']
				)
			},
			devDependencies: sortKeys({
				'@types/node': apiPkg.devDependencies['@types/node'],
				dotenv: workerPkg.dependencies.dotenv,
				prisma: newer(apiPkg.devDependencies.prisma, workerPkg.devDependencies.prisma),
				'prisma-dbml-generator': apiPkg.devDependencies['prisma-dbml-generator'],
				typescript: apiPkg.devDependencies.typescript
			})
		},
		null,
		'\t'
	) + '\n'
);

// ---------------------------------------------------------------- 4. apps/api

console.log('==> apps/api: imports, config, scripts');
rewriteAll('apps/api', (text) =>
	text
		.replace(/([`'"])@db\//g, '$1@acme/db/')
		.replace(/(['"])(\.\.\/)+prisma\/generated\/client\1/g, '$1@acme/db/client$1')
);

patch('apps/api/tsconfig.json', [['\t\t\t"@acme/db/*": ["./prisma/generated/*"],\n', '']]);
patch('apps/api/vitest.config.ts', [["\t\t\t'@db': resolve(__dirname, 'prisma/generated'),\n", '']]);
patch('apps/api/eslint.config.mjs', [["'coverage/', 'prisma/generated/**'", "'coverage/'"]]);
patch('apps/api/.watchmanconfig', [['"prisma/generated", ', '']]);
patch('apps/api/_gitignore', [['prisma/schema.dbml\n', '']]);

patch('apps/api/.bin/dc.ts', [
	[
		'const TEST = \'docker compose -f compose.test.yml -p acme-test\';',
		`// The compose files sit at the monorepo root, shared by every app.
const DEV = 'docker compose -f ../../compose.yml';
const TEST = 'docker compose -f ../../compose.test.yml -p acme-test';`
	],
	['return `docker compose up -d ${SERVICES}`;', 'return `${DEV} up -d ${SERVICES}`;'],
	["return 'docker compose run --rm wait';", 'return `${DEV} run --rm wait`;'],
	["return 'docker compose down';", 'return `${DEV} down`;'],
	[
		'return `docker compose down && docker compose up -d ${SERVICES} && docker compose run --rm wait`;',
		'return `${DEV} down && ${DEV} up -d ${SERVICES} && ${DEV} run --rm wait`;'
	]
]);

patchRange(
	'apps/api/.bin/db.ts',
	'class CommandBuilder {',
	'class Database extends Argv',
	`// The schema and migrations live in packages/db (@acme/db); the env files live
// here, because the API owns the database. So Prisma runs in that workspace with
// this app's env loaded first.
const ENV_FILES: Record<Env, string> = {
	dev: '.env',
	test: '.env.test',
	prod: '.env.production'
};

class CommandBuilder {
	private command: string[];

	private constructor(private env: Env = 'dev') {
		this.command = [\`dotenv -e \${ENV_FILES[env]} --\`];
	}

	static init(env: Env) {
		return new CommandBuilder(env);
	}

	private prisma(...args: string[]) {
		this.command.push('yarn workspace @acme/db prisma', ...args);
		return this;
	}

	generate() {
		// Generates and compiles the client every app imports as @acme/db/*.
		this.command = ['yarn workspace @acme/db build'];
		return this;
	}

	push() {
		// push targets test/prod (reseeded), so accept column drops non-interactively.
		return this.prisma('db push --accept-data-loss');
	}

	reset() {
		// Prisma 7 no longer seeds after a reset; re-seed with \`yarn db:seed\`.
		return this.prisma('migrate reset --force');
	}

	studio() {
		return this.prisma('studio --browser none --port 5025');
	}

	seed() {
		// tsx, not ts-node: ts-node follows the @acme/db symlink into packages/db
		// and refuses the compile (TS5011, a source root outside the project).
		this.command.push('tsx seeders');
		return this;
	}

	build() {
		return this.command.join(' ');
	}
}

`
);

editJson('apps/api/package.json', (pkg) => {
	pkg.name = '@acme/api';
	delete pkg.packageManager;
	// Suites resolves its Vitest adapter from beside @suites/unit; hoisting one
	// and not the other breaks every spec that builds a TestBed.
	pkg.installConfig = { hoistingLimits: 'workspaces' };
	const scripts = {};
	for (const [key, value] of Object.entries(pkg.scripts)) {
		scripts[key] = value;
		if (key === 'start') scripts.dev = value;
		if (key === 'lint') scripts.typecheck = 'tsc --noEmit';
	}
	Object.assign(scripts, {
		'db:generate': 'yarn workspace @acme/db build',
		'db:migrate:create':
			'dotenv -e .env -- yarn workspace @acme/db prisma migrate dev --create-only',
		// "$@" keeps `yarn db:migrate --name x` on the migrate step; without it Yarn
		// appends the arguments to the last command, `db:generate`.
		'db:migrate':
			'dotenv -e .env -- yarn workspace @acme/db prisma migrate dev "$@" && yarn db:generate',
		'db:migrate:prod': 'yarn workspace @acme/db prisma migrate deploy',
		'test:db:generate': 'yarn db:generate'
	});
	pkg.scripts = scripts;
	delete pkg.dependencies['@prisma/client'];
	pkg.dependencies['@acme/db'] = 'workspace:*';
	pkg.dependencies = sortKeys(pkg.dependencies);
	delete pkg.devDependencies.prisma;
	delete pkg.devDependencies['prisma-dbml-generator'];
	// The seeders import dotenv/config; prisma used to bring it in transitively.
	pkg.devDependencies.dotenv = workerPkg.dependencies.dotenv;
	pkg.devDependencies.tsx = workerPkg.devDependencies.tsx;
	pkg.devDependencies = sortKeys(pkg.devDependencies);
});

// One Infisical folder per app, like react-monorepo's /frontend/<app>: both
// source templates fetch from the project root, which here would hand the API's
// secrets to the worker and the other way round.
patch('apps/api/infisical.jsonc', [['"path": "/",', '"path": "/backend/api",']]);

console.log('==> apps/api: guidance');
patch('apps/api/CLAUDE.md', [
	[
		'validation and serialisation, an OpenAPI reference at `/docs`.\n',
		`validation and serialisation, an OpenAPI reference at \`/docs\`.

It is the \`@acme/api\` workspace of a \`nest-monorepo\` (see \`../../CLAUDE.md\`).
The Prisma schema, migrations and client live in \`packages/db\` (\`@acme/db\`),
shared with every other app; this app owns the database, so every \`db:*\`
command runs from here.
`
	],
	[
		'yarn dc:up && yarn dc:wait   # local Postgres + Redis (compose.yml)',
		'yarn dc:up && yarn dc:wait   # local Postgres + Redis (root compose.yml)'
	],
	[
		'yarn db:migrate              # create/apply a migration (prisma migrate dev)',
		`yarn db:migrate              # create/apply a migration, then rebuild @acme/db
yarn db:generate             # rebuild the @acme/db client without migrating`
	],
	[
		'Tests run against their own Postgres and Redis (`compose.test.yml`, ports',
		'Tests run against their own Postgres and Redis (root `compose.test.yml`, ports'
	],
	[
		'- `prisma/schema/*.prisma`: one schema split by area; `enum.prisma` holds\n  every enum. `seeders/`: seed data.',
		'- `../../packages/db/prisma/schema/*.prisma`: one schema split by area;\n  `enum.prisma` holds every enum. Migrations sit beside it in\n  `packages/db/prisma/migrations/`. `seeders/`: seed data (stays here).'
	],
	[
		"  `@acme/db/client` for Prisma types, relative barrels (`'../services'`) inside a\n  module.",
		"  `@acme/db/client` and `@acme/db/enums` for Prisma, relative barrels\n  (`'../services'`) inside a module."
	],
	[
		'- **Migrations are generated, not hand-written**: `yarn db:migrate` against\n  the schema files. Never edit a migration that has been applied elsewhere.',
		`- **Migrations are generated, not hand-written**: \`yarn db:migrate\` against
  the schema files in \`packages/db\`. Never edit a migration that has been
  applied elsewhere. A schema change reaches every app that imports
  \`@acme/db\`: run \`yarn typecheck\` from the monorepo root.
- **The API runs the compiled client** (\`packages/db/dist\`). After
  \`db:migrate\` / \`db:generate\`, restart \`yarn start\`; Nest's watch does not
  see the rebuild.`
	]
]);

rewriteAll('apps/api/.claude', (text) =>
	text
		.split('`prisma/schema/')
		.join('`packages/db/prisma/schema/')
		.split('`prisma/migrations/`')
		.join('`packages/db/prisma/migrations/`')
);
patch('apps/api/.claude/skills/add-model/SKILL.md', [
	[
		'The schema is split by area under `packages/db/prisma/schema/`: `base.prisma`',
		'The schema lives in the shared `@acme/db` package, split by area under\n`packages/db/prisma/schema/` at the monorepo root: `base.prisma`'
	],
	[
		'yarn db:migrate          # prisma migrate dev: names, creates and applies the migration',
		'yarn db:migrate          # prisma migrate dev in @acme/db, then rebuilds the client'
	],
	[
		'The client regenerates with the migration; import types from `@acme/db/client`\n(`Prisma`, `Thing`) and enums from `@acme/db/enums`.',
		'`yarn db:migrate` rebuilds the client (`yarn db:generate` does it alone).\nImport types from `@acme/db/client` (`Prisma`, `Thing`) and enums from\n`@acme/db/enums`, then restart `yarn start`: it runs the compiled client.'
	],
	[
		'A worker that reads this table gets the schema change too: copy the schema\nfile (or update the submodule) and run its `yarn db:generate`. A Python worker\nneeds its SQLAlchemy model updated by hand.',
		'Every app in this monorepo imports the same `@acme/db` client, so it gets the\nchange automatically. Run `yarn typecheck` from the monorepo root to catch\nanything the change broke elsewhere. A Python worker needs its SQLAlchemy\nmodel updated by hand.'
	]
]);

// ---------------------------------------------------------------- 5. apps/worker

console.log('==> apps/worker: imports, config, feature names');
const WORKER_RENAMES = {
	queue: 'worker-queue',
	browser: 'worker-browser',
	pm2: 'worker-pm2',
	telemetry: 'observability'
};
// Its two core features are the worker itself here: app-worker owns them.
const WORKER_ABSORBED = new Set(['prisma', 'logging']);

const renameExpr = (expr) =>
	expr.replace(/(!?)([a-z][a-z0-9-]*)/g, (m, bang, name) =>
		WORKER_RENAMES[name] ? bang + WORKER_RENAMES[name] : m
	);

rewriteAll('apps/worker', (text) =>
	text
		.split('\n')
		.map((line) => {
			const at = line.search(/@feature(:start|:else|:end)?\b/);
			if (at === -1) return line;
			// Only the marker's own expression is renamed, never the code before it
			// (`RUN npm install -g pm2@7 # @feature temporal`).
			const head = line.slice(0, at);
			const tail = line.slice(at).replace(
				/^(@feature(?::start)?)(\s+)(.*?)(\s*(?:-->|\*\/)?\s*)$/,
				(m, kw, sp, expr, close) => kw + sp + renameExpr(expr) + close
			);
			return head + tail;
		})
		.join('\n')
		.replace(/#prisma\/client\.js/g, '@acme/db/client')
		// node-worker's working name; `acme` then becomes the project name.
		.replace(/\bcollector\b/g, 'acme-worker')
);

patch('apps/worker/tsconfig.json', [
	['\t\t\t"#prisma/*": ["./prisma/generated/*"],\n', ''],
	['"include": ["src", "prisma/generated", "prisma.config.ts"]', '"include": ["src"]']
]);

editJson('apps/worker/package.json', (pkg) => {
	pkg.name = '@acme/worker';
	delete pkg.packageManager;
	delete pkg.imports['#prisma/*'];
	pkg.scripts['db:generate'] = 'yarn workspace @acme/db build';
	delete pkg.dependencies['@prisma/client'];
	pkg.dependencies['@acme/db'] = 'workspace:*';
	pkg.dependencies = sortKeys(pkg.dependencies);
	delete pkg.devDependencies.prisma;
	delete pkg.devDependencies['prisma-dbml-generator'];
	// Only the removed .bin scripts used these.
	for (const dep of ['shelljs', 'yargs']) delete pkg.dependencies[dep];
	for (const dep of ['@types/shelljs', '@types/yargs']) delete pkg.devDependencies[dep];
});

patch('apps/worker/infisical.jsonc', [
	['"path": "/",', '"path": "/backend/worker",'],
	// The worker's packages are hoisted to the monorepo root.
	['"./node_modules/@aurostack/secrets/schema.json"', '"../../node_modules/@aurostack/secrets/schema.json"']
]);

console.log('==> apps/worker: guidance');
patch('apps/worker/CLAUDE.md', [
	[
		"no HTTP server: it consumes the jobs an API produces, against the API's own\ndatabase.\n",
		"no HTTP server: it consumes the jobs an API produces, against the API's own\ndatabase.\n\nIt is the `@acme/worker` workspace of a `nest-monorepo` (see\n`../../CLAUDE.md`). Its Prisma client is the shared `@acme/db` package\n(`packages/db`), the same build the API uses.\n"
	],
	[
		'yarn db:generate    # Prisma client from prisma/schema (needed after every schema change)',
		"yarn db:generate    # rebuild the shared @acme/db client (the API's db:migrate does this too)"
	],
	[
		'There is no test script. The Docker build (`yarn install --immutable`,\n`yarn db:generate`, `yarn build`) is what CI runs, so `yarn.lock` and\n`.yarnrc.yml` must be committed.',
		'There is no test script. CI runs `turbo run lint typecheck test build` from the\nmonorepo root, and the image is built from there too\n(`docker build -f apps/worker/Dockerfile .`), so the root `yarn.lock` and\n`.yarnrc.yml` must be committed.'
	],
	[
		'- Imports use the `#app/*`, `#utils/*`, `#lib/*`, `#prisma/*` aliases, with\n  `.js` extensions (`#app/logger.js`).',
		'- Imports use the `#app/*`, `#utils/*`, `#lib/*` aliases, with `.js`\n  extensions (`#app/logger.js`). Prisma comes from `@acme/db/client` (no\n  extension: it is a package export).'
	],
	[
		"- **The API owns the database.** `prisma/schema/` is a copy (or a submodule)\n  of the API's schema; never write migrations here. Replace the placeholder\n  `User` in `base.prisma` with the API's models rather than deleting it: the\n  `db.ts` extensions are typed against it. Run `yarn db:generate` after every\n  schema change.",
		"- **The API owns the database.** The schema and migrations live in\n  `packages/db` and change only through the API's `yarn db:migrate`; never\n  migrate from here. Every model the API has is already in `@acme/db/client`.\n  The `db.ts` extensions are typed against `User`, so typecheck after a schema\n  change. The worker runs the compiled client, so restart `yarn dev` after the\n  client is rebuilt."
	]
]);
patch('apps/worker/.claude/skills/add-worker/SKILL.md', [
	[
		'   - Use `DB.instance` from `#app/db.js` for data. Only models in\n     `prisma/schema/` exist; if the job needs a table the worker has not got,\n     bring the API\'s schema in and run `yarn db:generate` first.',
		"   - Use `DB.instance` from `#app/db.js` for data. It is the shared\n     `@acme/db` client, so every model the API has exists here. If the job\n     needs a table that does not exist yet, add it through the API's\n     `add-model` (the API owns migrations), not from the worker."
	]
]);

// ---------------------------------------------------------------- 6. overrides

console.log('==> overrides');
copyTree(OVERRIDES, DST);
editJson('package.json', (pkg) => {
	// One package manager pin for the whole workspace: the API's.
	pkg.packageManager = apiPkg.packageManager;
	// `stack add` / `stack upgrade` reformat their scratch copies with the root
	// `format` script and the root Prettier, so both have to exist here: one
	// Prettier pass over what each app's own `format` script covers.
	pkg.devDependencies = sortKeys({
		...pkg.devDependencies,
		prettier: apiPkg.devDependencies.prettier
	});
});

// ---------------------------------------------------------------- 7. manifest

console.log('==> template.json');
const base = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.base.json'), 'utf8'));

const ROOT_FILES = new Set(['compose.yml', 'compose.test.yml', '.dockerignore', '.forgejo/**']);
const remapApi = (glob) =>
	ROOT_FILES.has(glob)
		? glob
		: glob.startsWith('prisma/schema/')
			? `packages/db/${glob}`
			: `apps/api/${glob}`;
const remapWorker = (glob) => (ROOT_FILES.has(glob) ? glob : `apps/worker/${glob}`);

const withFile = (spec, file) =>
	(Array.isArray(spec) ? spec : [spec]).map((s) => ({ file, ...s }));

const features = {};
const merge = (name, def) => {
	const prev = features[name];
	if (!prev) {
		features[name] = def;
		return;
	}
	const union = (a = [], b = []) => [...new Set([...a, ...b])];
	features[name] = {
		...prev,
		default: Boolean(prev.default || def.default) || undefined,
		requires: union(prev.requires, def.requires),
		files: union(prev.files, def.files),
		packageJson: [...(prev.packageJson || []), ...(def.packageJson || [])]
	};
};

for (const [name, def] of Object.entries(apiManifest.features)) {
	const out = { ...def };
	if (def.files) out.files = def.files.map(remapApi);
	if (def.packageJson) {
		out.packageJson = withFile(def.packageJson, 'apps/api/package.json');
		// dotenv-cli runs every db:* script here, so it cannot go with `testing`.
		for (const spec of out.packageJson) {
			if (spec.devDependencies) {
				spec.devDependencies = spec.devDependencies.filter((d) => d !== 'dotenv-cli');
			}
		}
	}
	merge(name, out);
}

for (const [name, def] of Object.entries(workerManifest.features)) {
	if (WORKER_ABSORBED.has(name)) continue;
	const target = WORKER_RENAMES[name] || name;
	const out = { ...def };
	if (def.files) out.files = def.files.map(remapWorker);
	if (def.packageJson) out.packageJson = withFile(def.packageJson, 'apps/worker/package.json');
	merge(target, out);
}

// manifest.base.json: new features, and field overrides for carried ones.
// `extraFiles` / `extraPackageJson` append to what the sources declared.
for (const [name, def] of Object.entries(base.features || {})) {
	const { extraFiles, extraPackageJson, ...fields } = def;
	features[name] = { ...(features[name] || {}), ...fields };
	if (extraFiles) {
		features[name].files = [...new Set([...(features[name].files || []), ...extraFiles])];
	}
	if (extraPackageJson) {
		features[name].packageJson = [...(features[name].packageJson || []), ...extraPackageJson];
	}
}

// Drop the empties the merge leaves behind, so the manifest reads like a
// hand-written one.
for (const def of Object.values(features)) {
	for (const key of ['requires', 'files', 'packageJson']) {
		if (Array.isArray(def[key]) && def[key].length === 0) delete def[key];
	}
	if (def.default === undefined) delete def.default;
	if (Array.isArray(def.packageJson) && def.packageJson.length === 1) {
		def.packageJson = def.packageJson[0];
	}
}

const dedupe = (rules) => {
	const seen = new Set();
	return rules.filter((r) => {
		const key = `${r.from}\u0000${r.regex ? 1 : 0}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const { features: _ignored, replacements: baseReplacements = [], ...top } = base;
const manifest = {
	...top,
	replacements: dedupe([
		...baseReplacements,
		// The source templates' working names, minus the two this script renamed.
		...apiManifest.replacements.filter((r) => r.from !== '@starter/backend'),
		...workerManifest.replacements.filter((r) => r.from !== 'collector')
	]),
	features
};
fs.writeFileSync(path.join(HERE, 'template.json'), JSON.stringify(manifest, null, '\t') + '\n');

console.log('==> done. Now run: stack doctor nest-monorepo');
