import { searchPlugin } from '@payloadcms/plugin-search';
import type { BeforeSync, DocToSync } from '@payloadcms/plugin-search/types';
import type { Field } from 'payload';

/**
 * Site search: Payload keeps a `search` collection in sync with the
 * collections listed here, and /search queries it. Each entry carries what a
 * result needs to render (title, link, description, image) so the results
 * page never loads the source documents.
 */
const SEARCHED = [
	'pages',
	'products' // @feature shop
] as const;

const fields: Field[] = [
	{ name: 'slug', type: 'text', index: true, admin: { readOnly: true } },
	{
		name: 'meta',
		type: 'group',
		admin: { readOnly: true },
		fields: [
			{ name: 'title', type: 'text' },
			{ name: 'description', type: 'text' },
			{ name: 'image', type: 'upload', relationTo: 'media' }
		]
	}
];

const beforeSync: BeforeSync = ({ originalDoc, searchDoc }) => {
	const { slug, title, meta } = originalDoc;
	return {
		...searchDoc,
		slug,
		meta: {
			title: meta?.title || title,
			description: meta?.description,
			image: meta?.image?.id ?? meta?.image
		}
	} as DocToSync;
};

export const siteSearch = searchPlugin({
	collections: [...SEARCHED],
	beforeSync,
	searchOverrides: {
		admin: { group: 'Content' },
		fields: ({ defaultFields }) => [...defaultFields, ...fields]
	}
});
