import configPromise from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import type { Config } from '@/payload-types';

type Global = keyof Config['globals'];

/**
 * A global (header, footer), read once per request. Deliberately not put in
 * Next's data cache: pages render per request against a local database, so
 * the saving is a millisecond, and an uncached read means an owner's edit in
 * the admin shows on the very next page view with nothing to invalidate.
 */
export const getGlobal = cache(async <T extends Global>(slug: T, depth = 0) => {
	const payload = await getPayload({ config: configPromise });
	return payload.findGlobal({ slug, depth });
});
