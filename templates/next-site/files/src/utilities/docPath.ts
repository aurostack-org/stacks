/** Where a page or product lives on the site, by collection and slug. */
export const docPath = (collection: string, slug: string) =>
	collection === 'pages' ? (slug === 'home' ? '/' : `/${slug}`) : `/${collection}/${slug}`;
