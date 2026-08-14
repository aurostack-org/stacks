import { execSync } from 'node:child_process';

// Pulls this app's env from Infisical into the matching .env file.
//
// The project ID is read from the environment rather than hardcoded: it
// identifies one organisation's vault, so a value baked in here would follow
// every copy of this scaffold to projects it has nothing to do with. Put it in
// your shell profile, or in a committed `.infisical.json`.
const PROJECT_ID = process.env.INFISICAL_PROJECT_ID;
const SECRET_PATH = process.env.INFISICAL_PATH ?? '/';

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

if (!PROJECT_ID) {
	console.error('INFISICAL_PROJECT_ID is not set — nothing to fetch from.');
	process.exit(1);
}

const env = normalizeEnv(parseEnvArg());
const envFile = ENV_FILES[env];

console.log(`Fetching secrets (${env}) -> ${envFile}...`);
execSync(`infisical export --projectId="${PROJECT_ID}" --path="${SECRET_PATH}" --env=${env} > ${envFile}`, {
	stdio: 'inherit'
});
