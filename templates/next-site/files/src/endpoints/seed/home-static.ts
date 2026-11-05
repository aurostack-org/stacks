import type { RequiredDataFromCollectionSlug } from 'payload';

import { h1, p, richText } from './richText';

/** Shown at / until a Home page exists, so a fresh site is not a 404. */
export const homeStaticData = (): RequiredDataFromCollectionSlug<'pages'> => ({
	slug: 'home',
	title: 'Home',
	_status: 'published',
	hero: {
		type: 'lowImpact',
		richText: richText(
			h1('Acme Corp'),
			p('This site has no home page yet. Sign in at /admin and create a page with the slug "home".')
		)
	},
	layout: [],
	meta: {
		title: 'Acme Corp'
	}
});
