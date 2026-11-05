import { redirectsPlugin } from '@payloadcms/plugin-redirects';

/**
 * Redirects the owner manages in the admin (Content → Redirects), for pages
 * that moved or were renamed. They are checked when a page is not found, so
 * they cost nothing on pages that exist. Fixed redirects that never change
 * belong in /redirects.ts instead.
 */
export const ownerRedirects = redirectsPlugin({
	collections: [
		'pages',
		'products' // @feature shop
	],
	overrides: {
		admin: { group: 'Content' }
	}
});
