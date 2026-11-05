import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types';

import { notifyNewOrder } from './hooks/notifyNewOrder';
import { stampPaidAt } from './hooks/stampPaidAt';

/**
 * The plugin's orders collection, plus:
 * - `accessToken`, so a guest can open their order page from the link they get;
 * - `paymentStatus`, which says whether money has actually been received. The
 *   plugin's own `status` is the fulfilment state; the manual payment method
 *   creates orders before payment, so the two have to be separate fields.
 */
export const OrdersCollection: CollectionOverride = ({ defaultCollection }) => ({
	...defaultCollection,
	admin: {
		...defaultCollection.admin,
		defaultColumns: ['createdAt', 'customerEmail', 'amount', 'paymentStatus', 'status']
	},
	hooks: {
		...defaultCollection.hooks,
		beforeChange: [...(defaultCollection.hooks?.beforeChange || []), stampPaidAt],
		afterChange: [...(defaultCollection.hooks?.afterChange || []), notifyNewOrder]
	},
	fields: [
		...defaultCollection.fields,
		{
			name: 'paymentStatus',
			type: 'select',
			required: true,
			// Every adapter except manual calls finalizeOrder only after the
			// provider has confirmed the money, so "paid" is the right default.
			// The manual adapter sets 'awaiting-payment' explicitly.
			defaultValue: 'paid',
			index: true,
			options: [
				{ label: 'Awaiting payment', value: 'awaiting-payment' },
				{ label: 'Paid', value: 'paid' },
				{ label: 'Refunded', value: 'refunded' }
			],
			admin: {
				position: 'sidebar',
				description: 'Set to Paid once the money has arrived.'
			}
		},
		{
			name: 'paymentReference',
			type: 'text',
			index: true,
			admin: {
				position: 'sidebar',
				readOnly: true,
				description: 'What the customer was asked to quote when paying.'
			}
		},
		{
			name: 'paidAt',
			type: 'date',
			admin: { position: 'sidebar', readOnly: true }
		},
		{
			name: 'accessToken',
			type: 'text',
			unique: true,
			index: true,
			admin: {
				position: 'sidebar',
				readOnly: true
			},
			hooks: {
				beforeValidate: [
					({ value, operation }) => {
						if (operation === 'create' || !value) {
							return crypto.randomUUID();
						}
						return value;
					}
				]
			}
		}
	]
});
