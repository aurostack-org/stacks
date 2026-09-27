import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Pulls this workspace's env from Infisical into the matching .env file.
// The Infisical path is derived from the package name, e.g.
//   @scope/types -> /frontend/types, landing -> /frontend/landing
//
// The project ID comes from the environment rather than being hardcoded: it
// identifies one organisation's vault, so a value baked in here would follow
// every copy of this scaffold to projects it has nothing to do with. Put it in
// your shell profile, or in a committed `.infisical.json`.
const PROJECT_ID = process.env.INFISICAL_PROJECT_ID;
const SECRET_ROOT = process.env.INFISICAL_PATH_PREFIX ?? '/frontend';

const ENV_FILES = {
	dev: '.env',
	test: '.env.test',
	staging: '.env.staging',
	prod: '.env.production'
};

const normalizeEnv = (raw) => {
	if (['dev', 'development'].includes(raw)) return 'dev';
	if (['test', 'testing'].includes(raw)) return 'test';
	if (['prod', 'production'].includes(raw)) return 'prod';
	if (raw === 'staging') return 'staging';
	throw new Error(`Unknown env '${raw}' (use one of: dev, test, staging, prod)`);
};

const parseEnvArg = () => {
	const args = process.argv.slice(2);
	const flagIndex = args.findIndex((a) => a === '-e' || a === '--env');
	if (flagIndex !== -1 && args[flagIndex + 1]) return args[flagIndex + 1];
	const inline = args.find((a) => a.startsWith('--env='));
	if (inline) return inline.slice('--env='.length);
	return 'development';
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const slug = pkg.name.replace(/^@[^/]+\//, '');
const secretPath = `${SECRET_ROOT}/${slug}`;

if (!PROJECT_ID) {
	console.error('INFISICAL_PROJECT_ID is not set — nothing to fetch from.');
	process.exit(1);
}

const env = normalizeEnv(parseEnvArg());
const envFile = ENV_FILES[env];

console.log(`Fetching secrets for '${slug}' (${env}) -> ${envFile}...`);
// Export first and write only on success: a shell `>` redirect would empty
// the existing file before infisical had the chance to fail. execSync throws
// (and the process exits non-zero) when infisical fails.
const output = execSync(`infisical export --projectId="${PROJECT_ID}" --path="${secretPath}" --env=${env}`, {
	stdio: ['inherit', 'pipe', 'inherit']
});
writeFileSync(envFile, output);
console.log(`Wrote ${envFile}`);
