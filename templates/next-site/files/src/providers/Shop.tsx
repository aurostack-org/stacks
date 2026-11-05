import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react';
import React from 'react';

import { currenciesConfig } from '@/lib/currency';
import { paymentMethodsClient } from '@/payments/client';
import { AuthProvider } from '@/providers/Auth';

/** Customer sign-in and the cart, for every storefront page. */
export const ShopProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AuthProvider>
		<EcommerceProvider
			currenciesConfig={currenciesConfig}
			enableVariants={true}
			api={{
				cartsFetchQuery: {
					depth: 2,
					populate: {
						products: { slug: true, title: true, gallery: true, inventory: true },
						variants: { title: true, inventory: true }
					}
				}
			}}
			paymentMethods={paymentMethodsClient}
		>
			{children}
		</EcommerceProvider>
	</AuthProvider>
);
