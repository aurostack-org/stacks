'use client';

import React, { Suspense } from 'react';

import { Cart } from '@/components/Cart';
import { OpenCartButton } from '@/components/Cart/OpenCart';

/** The cart button in the header. */
export function ShopActions() {
	return (
		<Suspense fallback={<OpenCartButton />}>
			<Cart />
		</Suspense>
	);
}
