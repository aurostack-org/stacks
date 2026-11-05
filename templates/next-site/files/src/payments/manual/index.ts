import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types';
import { randomInt } from 'node:crypto';
import type { DefaultDocumentIDType } from 'payload';

/**
 * Manual payment: the customer places the order now and pays outside the site
 * (cash or mobile money on delivery, a bank transfer, a payment link), and the
 * owner marks the order paid in the admin once the money arrives.
 *
 * The order is created at checkout so stock is reserved and both sides get a
 * record, but it carries `paymentStatus: 'awaiting-payment'`. The plugin's
 * `finalizeOrder` always marks the *transaction* `succeeded` (to the plugin it
 * means "settled into an order"), so for this method the order's
 * `paymentStatus` is the field that says whether money has been received.
 */
export const MANUAL = 'manual';

// No 0/O or 1/I/L: the customer copies this into a transfer reference by hand.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateReference(): string {
	const pick = () => ALPHABET[randomInt(ALPHABET.length)];
	const part = () => Array.from({ length: 4 }, pick).join('');
	return `${part()}-${part()}`;
}

const normalizeEmail = (value: unknown) =>
	typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined;

/** A relationship's ID as stored: number on Postgres, string on Mongo. */
const rawID = (value: unknown) =>
	(value && typeof value === 'object' && 'id' in value ? value.id : value) as DefaultDocumentIDType;

/** A relationship's ID as a string, for comparing across ID types. */
const idOf = (value: unknown): string | undefined => {
	const id: unknown = rawID(value);
	if (typeof id === 'number' && Number.isFinite(id)) return String(id);
	if (typeof id === 'string' && id.trim()) return id;
	return undefined;
};

export const manualAdapter = (props?: { label?: string }): PaymentAdapter => ({
	name: MANUAL,
	label: props?.label || 'Pay on delivery or by transfer',

	group: {
		name: MANUAL,
		type: 'group',
		admin: {
			condition: (data) => data?.paymentMethod === MANUAL
		},
		fields: [
			{
				name: 'reference',
				type: 'text',
				index: true,
				label: 'Payment reference',
				admin: {
					readOnly: true,
					description: 'The customer is asked to quote this when they pay.'
				}
			},
			{
				// Kept until the order is created, which copies it.
				name: 'shippingAddress',
				type: 'json',
				admin: { hidden: true }
			}
		]
	},

	initiatePayment: async ({ data, req, transactionsSlug }) => {
		const { cart, currency, customerEmail, billingAddress, shippingAddress } = data;
		const amount = cart?.subtotal;

		if (!cart?.items?.length) throw new Error('Cart is empty or not provided.');
		if (!currency) throw new Error('Currency is required.');
		if (!req.user && !normalizeEmail(customerEmail)) {
			throw new Error('A valid customer email is required to place an order.');
		}
		if (typeof amount !== 'number' || amount <= 0) {
			throw new Error('A valid amount is required to place an order.');
		}

		// The same snapshot shape the plugin's Stripe adapter stores: plain IDs,
		// so the order records what was bought even if the product changes later.
		const items = cart.items.map(({ product, variant, ...rest }) => ({
			...rest,
			product: rawID(product),
			quantity: rest.quantity,
			...(variant ? { variant: rawID(variant) } : {})
		}));

		const reference = generateReference();

		await req.payload.create({
			collection: transactionsSlug as 'transactions',
			data: {
				...(req.user ? { customer: req.user.id } : { customerEmail: normalizeEmail(customerEmail) }),
				amount,
				billingAddress,
				cart: cart.id,
				currency: currency.toUpperCase(),
				items,
				paymentMethod: MANUAL,
				status: 'pending',
				[MANUAL]: { reference, shippingAddress: shippingAddress ?? billingAddress }
			} as never,
			req
		});

		return { message: 'Order ready to place', reference };
	},

	confirmOrder: async ({ data, finalizeOrder, req, transactionsSlug = 'transactions' }) => {
		const reference = typeof data.reference === 'string' ? data.reference : '';
		if (!reference) throw new Error('Payment reference is required.');

		const { docs } = await req.payload.find({
			collection: transactionsSlug as 'transactions',
			depth: 0,
			limit: 2,
			pagination: false,
			req,
			where: { [`${MANUAL}.reference`]: { equals: reference } }
		});
		const transaction = docs[0] as Record<string, any> | undefined;
		if (docs.length !== 1 || !transaction) {
			throw new Error('Expected exactly one transaction for this reference.');
		}

		// The plugin has already resolved the caller's cart (signed-in user, or
		// guest cart + secret) and checked the email against it. Tie the
		// transaction to that same cart and purchaser, so a leaked reference alone
		// cannot settle someone else's order.
		if (idOf(transaction.cart) !== idOf(data.cartID)) {
			throw new Error('Transaction does not belong to this cart.');
		}
		if (req.user) {
			if (idOf(transaction.customer) !== idOf(req.user.id)) {
				throw new Error('Transaction does not belong to this customer.');
			}
		} else if (normalizeEmail(transaction.customerEmail) !== normalizeEmail(data.customerEmail)) {
			throw new Error('Transaction does not belong to this customer.');
		}

		const order = await finalizeOrder({
			orderData: {
				amount: transaction.amount,
				currency: transaction.currency,
				...(req.user ? { customer: req.user.id } : { customerEmail: normalizeEmail(transaction.customerEmail) }),
				items: transaction.items,
				shippingAddress: transaction[MANUAL]?.shippingAddress ?? undefined,
				status: 'processing',
				paymentStatus: 'awaiting-payment',
				paymentReference: reference
			},
			transactionID: transaction.id
		});

		return {
			message: 'Order placed',
			orderID: order.id as DefaultDocumentIDType,
			transactionID: transaction.id,
			reference,
			...(typeof order.accessToken === 'string' ? { accessToken: order.accessToken } : {})
		};
	}
});
