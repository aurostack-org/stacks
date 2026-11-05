import type { GlobalConfig } from 'payload';

import { isAdmin } from '@/access/isAdmin';

/**
 * Shop-wide settings the owner edits in the admin, without a deploy.
 * Readable by anyone because checkout and the order page show the payment
 * instructions; only admins can change them.
 */
export const ShopSettings: GlobalConfig = {
	slug: 'shop-settings',
	label: 'Shop settings',
	admin: { group: 'Ecommerce' },
	access: {
		read: () => true,
		update: isAdmin
	},
	fields: [
		{
			name: 'paymentInstructions',
			type: 'textarea',
			required: true,
			defaultValue: 'We will contact you to arrange payment. Please quote your payment reference when you pay.',
			admin: {
				description:
					'Shown at checkout, on the order page and in the order email. Say how to pay (mobile money number, bank details, pay on delivery) and ask the customer to quote their payment reference.'
			}
		},
		{
			name: 'orderNotificationEmail',
			type: 'email',
			admin: {
				description: 'Where new-order emails go. Leave empty to not send them.'
			}
		}
	]
};
