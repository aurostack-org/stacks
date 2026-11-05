import type { Metadata } from 'next';

import configPromise from '@payload-config';
import { getPayload } from 'payload';
import React from 'react';

import { CheckoutPage } from '@/components/checkout/CheckoutPage';
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph';

export const dynamic = 'force-dynamic';

export default async function Checkout() {
	const payload = await getPayload({ config: configPromise });
	const settings = await payload.findGlobal({ slug: 'shop-settings', depth: 0 });

	return (
		<div className="container min-h-[90vh] flex">
			<h1 className="sr-only">Checkout</h1>

			<CheckoutPage paymentInstructions={settings.paymentInstructions} />
		</div>
	);
}

export const metadata: Metadata = {
	description: 'Checkout.',
	openGraph: mergeOpenGraph({
		title: 'Checkout',
		url: '/checkout'
	}),
	title: 'Checkout'
};
