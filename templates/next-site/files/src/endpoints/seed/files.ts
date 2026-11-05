import fs from 'node:fs/promises';
import path from 'node:path';
import type { File } from 'payload';

const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml'
};

/**
 * A file that ships beside the seed, as a Payload upload. Resolved from the
 * project root because the seed runs inside a bundled route, where its own
 * directory is not on disk. The seed is a development tool, so it is never
 * run from the production image (which has no src/).
 */
export async function localFile(name: string): Promise<File> {
	const file = path.resolve(process.cwd(), 'src/endpoints/seed', name);
	const data = await fs.readFile(file);
	return {
		name: path.basename(file),
		data,
		mimetype: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
		size: data.byteLength
	};
}
