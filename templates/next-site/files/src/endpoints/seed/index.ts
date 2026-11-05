import type { CollectionSlug, Payload, PayloadRequest } from 'payload';

import type { Header } from '@/payload-types';

import { contactFormData } from './contact-form';
import { contactPageData } from './contact-page';
import { localFile } from './files';
import { homePageData } from './home';
import { imageHero1Data } from './image-hero-1';
import { seedShop, shopCollections } from './shop'; // @feature shop

type NavItem = NonNullable<Header['navItems']>[number];
const nav = (label: string, url: string): NavItem => ({ link: { type: 'custom', label, url } });

/** Cleared before each seed. The search index is rebuilt from what is created. */
const collections: CollectionSlug[] = [
	'media',
	'pages',
	'forms',
	'form-submissions',
	'search', // @feature search
	...shopCollections // @feature shop
];

const headerNav: NavItem[] = [
	nav('Home', '/'),
	nav('Shop', '/shop'), // @feature shop
	nav('Account', '/account'), // @feature shop
	nav('Contact', '/contact')
];

const footerNav: NavItem[] = [
	nav('Find my order', '/find-order'), // @feature shop
	nav('Admin', '/admin')
];

/**
 * Replaces the site's content with demo data. Destructive: every page, form,
 * media item and (with the shop) product and order is deleted first. Run from
 * the admin dashboard in development only; it refuses in production.
 */
export const seed = async ({ payload, req }: { payload: Payload; req: PayloadRequest }): Promise<void> => {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('Seeding deletes all content and is disabled in production.');
	}

	payload.logger.info('Seeding database...');
	payload.logger.info(`— Clearing collections...`);

	for (const collection of collections) {
		await payload.db.deleteMany({ collection, req, where: {} });
		if (payload.collections[collection].config.versions) {
			await payload.db.deleteVersions({ collection, req, where: {} });
		}
	}

	payload.logger.info(`— Seeding media...`);
	const heroImage = await payload.create({
		collection: 'media',
		data: imageHero1Data,
		file: await localFile('hero.webp')
	});

	await seedShop({ payload, req, heroImage }); // @feature shop

	payload.logger.info(`— Seeding contact form and pages...`);
	const contactForm = await payload.create({ collection: 'forms', depth: 0, data: contactFormData() });

	await Promise.all([
		payload.create({ collection: 'pages', depth: 0, data: homePageData({ heroImage }) }),
		payload.create({ collection: 'pages', depth: 0, data: contactPageData({ contactForm }) })
	]);

	payload.logger.info(`— Seeding header and footer...`);
	await Promise.all([
		payload.updateGlobal({ slug: 'header', data: { navItems: headerNav } }),
		payload.updateGlobal({ slug: 'footer', data: { navItems: footerNav } })
	]);

	payload.logger.info('Seeded database successfully!');
};
