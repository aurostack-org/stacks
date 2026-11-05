import { createLocalReq, getPayload, type Endpoint, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PRICE_ENABLED_FIELD, PRICE_FIELD, SHOP_CURRENCY } from '@/lib/currency';
import config from '@/payload.config';

/**
 * The manual payment method through the ecommerce plugin's real endpoints
 * (/api/payments/manual/initiate and /confirm-order), against a real database.
 */
let payload: Payload;
let productID: number;
const PRICE = 2500;
const STOCK = 10;
const email = `guest-${Date.now()}@example.com`;
const address = {
	firstName: 'Ama',
	lastName: 'Mensah',
	addressLine1: '1 Ring Road',
	city: 'Accra',
	country: 'GH',
	phone: '0240000000'
};

function endpoint(path: string): Endpoint {
	const found = payload.config.endpoints.find((e) => e.path === path && e.method === 'post');
	if (!found) throw new Error(`No POST endpoint at ${path}`);
	return found;
}

/** Calls a plugin endpoint as an anonymous visitor would, with a JSON body. */
async function call(path: string, data: Record<string, unknown>) {
	const req = await createLocalReq({}, payload);
	req.data = data;
	req.query = {};
	const res = await endpoint(path).handler(req);
	return { status: res.status, body: (await res.json()) as Record<string, any> };
}

async function guestCart(quantity: number) {
	const cart = await payload.create({
		collection: 'carts',
		// Guest carts carry the shopper's email; the generated Cart type omits it.
		data: { items: [{ product: productID, quantity }], currency: SHOP_CURRENCY.code, customerEmail: email } as never
	});
	return { cartID: cart.id, secret: (cart as { secret?: string }).secret };
}

beforeAll(async () => {
	payload = await getPayload({ config: await config });
	const product = await payload.create({
		collection: 'products',
		data: {
			title: 'Test bread',
			slug: `test-bread-${Date.now()}`,
			_status: 'published',
			inventory: STOCK,
			[PRICE_ENABLED_FIELD]: true,
			[PRICE_FIELD]: PRICE
		} as never
	});
	productID = product.id as number;
});

afterAll(async () => {
	if (!payload) return;
	await payload.delete({ collection: 'orders', where: { customerEmail: { equals: email } } });
	await payload.delete({ collection: 'transactions', where: { customerEmail: { equals: email } } });
	await payload.delete({ collection: 'products', id: productID });
});

describe('manual payment', () => {
	it('places an order that awaits payment, and only for the cart and email it was started with', async () => {
		const { cartID, secret } = await guestCart(2);

		const initiated = await call('/payments/manual/initiate', {
			cartID,
			secret,
			customerEmail: email,
			billingAddress: address,
			shippingAddress: address
		});
		expect(initiated.status).toBe(200);
		const reference = initiated.body.reference as string;
		expect(reference).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);

		const wrongEmail = await call('/payments/manual/confirm-order', {
			cartID,
			secret,
			customerEmail: 'someone-else@example.com',
			reference
		});
		expect(wrongEmail.status).toBeGreaterThanOrEqual(400);

		const madeUp = await call('/payments/manual/confirm-order', {
			cartID,
			secret,
			customerEmail: email,
			reference: 'ZZZZ-ZZZZ'
		});
		expect(madeUp.status).toBeGreaterThanOrEqual(400);

		const confirmed = await call('/payments/manual/confirm-order', { cartID, secret, customerEmail: email, reference });
		expect(confirmed.status).toBe(200);
		expect(confirmed.body.orderID).toBeDefined();

		const order = await payload.findByID({ collection: 'orders', id: confirmed.body.orderID, depth: 0 });
		expect(order.paymentStatus).toBe('awaiting-payment');
		expect(order.paymentReference).toBe(reference);
		expect(order.amount).toBe(2 * PRICE);
		expect(order.paidAt).toBeFalsy();

		const product = await payload.findByID({ collection: 'products', id: productID, depth: 0 });
		expect(product.inventory).toBe(STOCK - 2);

		// Confirming again returns the same order instead of placing a second one.
		const replay = await call('/payments/manual/confirm-order', { cartID, secret, customerEmail: email, reference });
		expect(replay.body.orderID).toBe(confirmed.body.orderID);
		const { totalDocs } = await payload.count({ collection: 'orders', where: { customerEmail: { equals: email } } });
		expect(totalDocs).toBe(1);
	});

	it('records when the owner marks an order paid', async () => {
		const { docs } = await payload.find({
			collection: 'orders',
			where: { customerEmail: { equals: email } },
			limit: 1
		});
		const paid = await payload.update({ collection: 'orders', id: docs[0].id, data: { paymentStatus: 'paid' } });
		expect(paid.paidAt).toBeTruthy();
	});
});
