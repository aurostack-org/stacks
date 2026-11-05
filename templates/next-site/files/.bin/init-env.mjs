// Creates .env from .env.example (if there is no .env yet) and fills every
// secret that is still empty with a fresh random value. Safe to re-run: it
// never touches a value that is already set.
//
//   yarn env:init
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';

const SECRETS = ['PAYLOAD_SECRET', 'PREVIEW_SECRET'];

if (!fs.existsSync('.env')) fs.copyFileSync('.env.example', '.env');

let env = fs.readFileSync('.env', 'utf8');
const filled = [];
for (const key of SECRETS) {
	const empty = new RegExp(`^${key}=(''|"")?\\s*$`, 'm');
	if (empty.test(env)) {
		env = env.replace(empty, `${key}='${randomBytes(32).toString('hex')}'`);
		filled.push(key);
	}
}
fs.writeFileSync('.env', env);
console.log(filled.length ? `.env: generated ${filled.join(', ')}` : '.env: secrets already set');
