/* eslint-disable @next/next/no-html-link-for-pages -- admin links leave the admin's own router */
import { Banner } from '@payloadcms/ui';
import React from 'react';

import { SeedButton } from './SeedButton';
import './index.scss';

const baseClass = 'before-dashboard';

type Tip = { href: string; label: string; text: string };

/** What the owner can do from here. Each entry is its own line so a feature can own one. */
const tips: Tip[] = [
	{ href: '/admin/collections/pages', label: 'Pages', text: 'edit what each page says and shows.' },
	{ href: '/admin/globals/header', label: 'Header', text: 'and Footer set the site menu links.' },
	{ href: '/admin/collections/products', label: 'Products', text: 'add what you sell, with prices and photos.' }, // @feature shop
	{ href: '/admin/collections/orders', label: 'Orders', text: 'mark an order Paid once the money arrives.' }, // @feature shop
	{ href: '/admin/globals/shop-settings', label: 'Shop settings', text: 'say how customers should pay you.' }, // @feature shop
	{ href: '/admin/collections/form-submissions', label: 'Form submissions', text: 'read messages sent from the site.' }
];

/** The welcome block above the admin dashboard, written for the site's owner. */
export const BeforeDashboard: React.FC = () => {
	return (
		<div className={baseClass}>
			<Banner className={`${baseClass}__banner`} type="success">
				<h4>Welcome to your site&apos;s admin</h4>
			</Banner>
			<ul className={`${baseClass}__instructions`}>
				{tips.map((tip) => (
					<li key={tip.href}>
						<a href={tip.href}>{tip.label}</a> {tip.text}
					</li>
				))}
				<li>
					<a href="/">View the site</a> to see your changes.
				</li>
			</ul>
			{/* Seeding replaces all content with demo data, so it is a development tool only. */}
			{process.env.NODE_ENV !== 'production' && (
				<p>
					<SeedButton /> to fill an empty development database with demo content (this deletes what is there).
				</p>
			)}
		</div>
	);
};
