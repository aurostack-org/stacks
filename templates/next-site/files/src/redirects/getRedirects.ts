import configPromise from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Every redirect, read once per request. Only called when a page was not
 * found, and not cached across requests so a redirect the owner adds works
 * immediately (see getGlobal for the reasoning).
 */
export const getRedirects = cache(async () => {
	const payload = await getPayload({ config: configPromise });
	const { docs } = await payload.find({ collection: 'redirects', depth: 1, limit: 0, pagination: false });
	return docs;
});
