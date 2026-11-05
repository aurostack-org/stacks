import type { Metadata } from 'next';

const SITE_NAME = process.env.SITE_NAME || 'Acme Corp';

/** Link-preview defaults; a page's own SEO fields (title, description, image) override them. */
const defaultOpenGraph: Metadata['openGraph'] = {
	type: 'website',
	siteName: SITE_NAME,
	title: SITE_NAME
};

export const mergeOpenGraph = (og?: Partial<Metadata['openGraph']>): Metadata['openGraph'] => ({
	...defaultOpenGraph,
	...og
});
