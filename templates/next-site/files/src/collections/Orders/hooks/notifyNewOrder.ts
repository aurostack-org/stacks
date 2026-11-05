import type { CollectionAfterChangeHook } from 'payload';

import { getServerSideURL } from '@/utilities/getURL';

/**
 * On a new order, emails the customer (with payment instructions when the
 * order is still unpaid) and the shop owner. A failed email is logged, never
 * thrown: the order is already placed and must not be rolled back over SMTP.
 */
export const notifyNewOrder: CollectionAfterChangeHook = async ({ context, doc, operation, req }) => {
	// The seed creates orders for demo data; nobody should be emailed for those.
	if (operation !== 'create' || context.disableOrderEmails) return doc;

	const { payload } = req;
	try {
		const settings = await payload.findGlobal({ slug: 'shop-settings', req, depth: 0 });
		const customer =
			doc.customer && typeof doc.customer === 'object'
				? doc.customer
				: doc.customer
					? await payload.findByID({ collection: 'users', id: doc.customer, depth: 0, req })
					: null;
		const customerEmail: string | undefined = doc.customerEmail || customer?.email;

		const orderURL = new URL(`/orders/${doc.id}`, getServerSideURL());
		if (!customer && customerEmail && doc.accessToken) {
			orderURL.searchParams.set('email', customerEmail);
			orderURL.searchParams.set('accessToken', doc.accessToken);
		}

		const awaiting = doc.paymentStatus === 'awaiting-payment';
		const lines = [
			`Thank you for your order.`,
			awaiting && doc.paymentReference ? `Payment reference: ${doc.paymentReference}` : '',
			awaiting ? settings.paymentInstructions : '',
			`View your order: ${orderURL.toString()}`
		].filter(Boolean);

		if (customerEmail) {
			await payload.sendEmail({
				to: customerEmail,
				subject: awaiting ? 'Your order — payment details' : 'Your order is confirmed',
				text: lines.join('\n\n')
			});
		}

		if (settings.orderNotificationEmail) {
			await payload.sendEmail({
				to: settings.orderNotificationEmail,
				subject: `New order${awaiting ? ' (awaiting payment)' : ''}${
					doc.paymentReference ? ` — ${doc.paymentReference}` : ''
				}`,
				text: [
					`A new order was placed by ${customerEmail || 'a customer'}.`,
					`Open it in the admin: ${new URL(`/admin/collections/orders/${doc.id}`, getServerSideURL())}`
				].join('\n\n')
			});
		}
	} catch (err) {
		payload.logger.error({ err, msg: `Could not send emails for order ${doc.id}` });
	}

	return doc;
};
