import type { Metadata } from 'next';

import type { Page } from '../payload-types';

import { docPath } from './docPath';
import { mergeOpenGraph } from './mergeOpenGraph';

const SITE_NAME = process.env.SITE_NAME || 'Acme Corp';

/** Metadata for a CMS page: its SEO fields, falling back to the page title and the site name. */
export const generateMeta = async (args: { doc: Page }): Promise<Metadata> => {
	const { doc } = args || {};

	const ogImage =
		typeof doc?.meta?.image === 'object' &&
		doc.meta.image !== null &&
		'url' in doc.meta.image &&
		`${process.env.NEXT_PUBLIC_SERVER_URL}${doc.meta.image.url}`;

	return {
		description: doc?.meta?.description,
		openGraph: mergeOpenGraph({
			...(doc?.meta?.description
				? {
						description: doc?.meta?.description
					}
				: {}),
			images: ogImage
				? [
						{
							url: ogImage
						}
					]
				: undefined,
			title: doc?.meta?.title || doc?.title || SITE_NAME,
			url: doc?.slug ? docPath('pages', doc.slug) : '/'
		}),
		title: doc?.meta?.title || doc?.title || SITE_NAME
	};
};
