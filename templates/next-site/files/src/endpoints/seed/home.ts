import type { RequiredDataFromCollectionSlug } from 'payload';

import type { Media } from '@/payload-types';

import { h1, h2, h3, p, richText } from './richText';

type HeroLink = NonNullable<NonNullable<RequiredDataFromCollectionSlug<'pages'>['hero']['links']>[number]>;

/** The hero's buttons. Each one is its own entry so a feature can own one. */
const heroLinks: HeroLink[] = [
	{ link: { type: 'custom', appearance: 'default', label: 'Shop now', url: '/shop' } }, // @feature shop
	{ link: { type: 'custom', appearance: 'outline', label: 'Contact us', url: '/contact' } }
];

const column = (heading: string, body: string) => ({
	size: 'oneThird' as const,
	richText: richText(h3(heading), p(body))
});

/**
 * Demo home page: placeholder copy that shows every part of the page builder
 * in use. Replace it in the admin (Pages → Home) with the business's own words.
 */
export const homePageData = ({ heroImage }: { heroImage: Media }): RequiredDataFromCollectionSlug<'pages'> => ({
	slug: 'home',
	title: 'Home',
	_status: 'published',
	hero: {
		type: 'highImpact',
		media: heroImage,
		links: heroLinks,
		richText: richText(
			h1('Acme Corp'),
			p('A short line about what the business does and who it is for. Edit it in the admin under Pages → Home.')
		)
	},
	layout: [
		{
			blockName: 'What we do',
			blockType: 'content',
			columns: [
				{ size: 'full', richText: richText(h2('What we do')) },
				column('Quality', 'Say what makes the business good at what it does.'),
				column('Service', 'Describe how customers are looked after.'),
				column('Location', 'Tell visitors where to find you and when you are open.')
			]
		},
		{
			blockName: 'Photo',
			blockType: 'mediaBlock',
			media: heroImage
		},
		{
			blockName: 'Get in touch',
			blockType: 'cta',
			links: [{ link: { type: 'custom', appearance: 'default', label: 'Contact us', url: '/contact' } }],
			richText: richText(h3('Ready to talk?'), p('Send us a message and we will get back to you.'))
		}
	],
	meta: {
		title: 'Acme Corp',
		description: 'A short description of the business for search engines and link previews.',
		image: heroImage
	}
});
