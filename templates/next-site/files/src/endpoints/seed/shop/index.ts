import type { File, Payload, PayloadRequest } from 'payload';

import { SHOP_CURRENCY } from '@/lib/currency';
import type { Address, Media, Transaction, VariantOption } from '@/payload-types';

import { localFile } from '../files';
import { imageHatData } from './image-hat';
import { imageTshirtBlackData } from './image-tshirt-black';
import { imageTshirtWhiteData } from './image-tshirt-white';
import { productHatData } from './product-hat';
import { productTshirtData, productTshirtVariant } from './product-tshirt';

/** Everything the shop owns, cleared before each seed. */
export const shopCollections = [
	'categories',
	'products',
	'variants',
	'variantOptions',
	'variantTypes',
	'carts',
	'transactions',
	'addresses',
	'orders'
] as const;

const categories = ['Accessories', 'T-Shirts', 'Hats'];

const sizeVariantOptions = [
	{ label: 'Small', value: 'small' },
	{ label: 'Medium', value: 'medium' },
	{ label: 'Large', value: 'large' },
	{ label: 'X Large', value: 'xlarge' }
];

const colorVariantOptions = [
	{ label: 'Black', value: 'black' },
	{ label: 'White', value: 'white' }
];

const baseAddressUSData: Transaction['billingAddress'] = {
	title: 'Dr.',
	firstName: 'Otto',
	lastName: 'Octavius',
	phone: '1234567890',
	company: 'Oscorp',
	addressLine1: '123 Main St',
	addressLine2: 'Suite 100',
	city: 'New York',
	state: 'NY',
	postalCode: '10001',
	country: 'US'
};

const baseAddressUKData: Transaction['billingAddress'] = {
	title: 'Mr.',
	firstName: 'Oliver',
	lastName: 'Twist',
	phone: '1234567890',
	addressLine1: '48 Great Portland St',
	city: 'London',
	postalCode: 'W1W 7ND',
	country: 'GB'
};

// Next.js revalidation errors are normal when seeding the database without a server running
// i.e. running `yarn seed` locally instead of using the admin UI within an active app
// The app is not running to revalidate the pages and so the API routes are not available
// These error messages can be ignored: `Error hitting revalidate route for...`

/**
 * Demo catalogue and order history: two products with variants, a customer
 * (customer@example.com / password) with addresses, carts and orders.
 */
export async function seedShop({
	payload,
	req,
	heroImage
}: {
	payload: Payload;
	req: PayloadRequest;
	heroImage: Media;
}): Promise<void> {
	payload.logger.info(`— Seeding customer and shop media...`);

	await payload.delete({
		collection: 'users',
		depth: 0,
		where: { email: { equals: 'customer@example.com' } }
	});

	const files: File[] = await Promise.all(
		['hat-logo.png', 'tshirt-black.png', 'tshirt-white.png'].map((name) => localFile(`shop/${name}`))
	);
	const [imageHatBuffer, imageTshirtBlackBuffer, imageTshirtWhiteBuffer] = files;
	const imageHero = heroImage;

	const [customer, imageHat, imageTshirtBlack, imageTshirtWhite, accessoriesCategory, tshirtsCategory, hatsCategory] =
		await Promise.all([
			payload.create({
				collection: 'users',
				data: {
					name: 'Customer',
					email: 'customer@example.com',
					password: 'password',
					roles: ['customer']
				}
			}),
			payload.create({ collection: 'media', data: imageHatData, file: imageHatBuffer }),
			payload.create({ collection: 'media', data: imageTshirtBlackData, file: imageTshirtBlackBuffer }),
			payload.create({ collection: 'media', data: imageTshirtWhiteData, file: imageTshirtWhiteBuffer }),
			...categories.map((category) =>
				payload.create({ collection: 'categories', data: { title: category, slug: category } })
			)
		]);

	payload.logger.info(`— Seeding variant types and options...`);

	const sizeVariantType = await payload.create({
		collection: 'variantTypes',
		data: {
			name: 'size',
			label: 'Size'
		}
	});

	const sizeVariantOptionsResults: VariantOption[] = [];

	for (const option of sizeVariantOptions) {
		const result = await payload.create({
			collection: 'variantOptions',
			data: {
				...option,
				variantType: sizeVariantType.id
			}
		});
		sizeVariantOptionsResults.push(result);
	}

	const [small, medium, large, xlarge] = sizeVariantOptionsResults;

	const colorVariantType = await payload.create({
		collection: 'variantTypes',
		data: {
			name: 'color',
			label: 'Color'
		}
	});

	const [black, white] = await Promise.all(
		colorVariantOptions.map((option) => {
			return payload.create({
				collection: 'variantOptions',
				data: {
					...option,
					variantType: colorVariantType.id
				}
			});
		})
	);

	payload.logger.info(`— Seeding products...`);

	const productHat = await payload.create({
		collection: 'products',
		depth: 0,
		data: productHatData({
			galleryImage: imageHat,
			metaImage: imageHat,
			variantTypes: [colorVariantType],
			categories: [hatsCategory],
			relatedProducts: []
		})
	});

	const productTshirt = await payload.create({
		collection: 'products',
		depth: 0,
		data: productTshirtData({
			galleryImages: [
				{ image: imageTshirtBlack, variantOption: black },
				{ image: imageTshirtWhite, variantOption: white }
			],
			metaImage: imageTshirtBlack,
			contentImage: imageHero,
			variantTypes: [colorVariantType, sizeVariantType],
			categories: [tshirtsCategory],
			relatedProducts: [productHat]
		})
	});

	let hoodieID: number | string = productTshirt.id;

	if (payload.db.defaultIDType === 'text') {
		hoodieID = `"${hoodieID}"`;
	}

	const [smallTshirtHoodieVariant, mediumTshirtHoodieVariant, largeTshirtHoodieVariant, xlargeTshirtHoodieVariant] =
		await Promise.all(
			[small, medium, large, xlarge].map((variantOption) =>
				payload.create({
					collection: 'variants',
					depth: 0,
					data: productTshirtVariant({
						product: productTshirt,
						variantOptions: [variantOption, white]
					})
				})
			)
		);

	await Promise.all(
		[small, medium, large, xlarge].map((variantOption) =>
			payload.create({
				collection: 'variants',
				depth: 0,
				data: productTshirtVariant({
					product: productTshirt,
					variantOptions: [variantOption, black],
					...(variantOption.value === 'medium' ? { inventory: 0 } : {})
				})
			})
		)
	);

	payload.logger.info(`— Seeding addresses...`);

	const customerUSAddress = await payload.create({
		collection: 'addresses',
		depth: 0,
		data: {
			customer: customer.id,
			...(baseAddressUSData as Address)
		}
	});

	const customerUKAddress = await payload.create({
		collection: 'addresses',
		depth: 0,
		data: {
			customer: customer.id,
			...(baseAddressUKData as Address)
		}
	});

	payload.logger.info(`— Seeding transactions...`);

	const pendingTransaction = await payload.create({
		collection: 'transactions',
		data: {
			currency: SHOP_CURRENCY.code,
			customer: customer.id,
			paymentMethod: 'manual',
			manual: {
				reference: 'SEED-0001'
			},
			status: 'pending',
			billingAddress: baseAddressUSData
		}
	});

	const succeededTransaction = await payload.create({
		collection: 'transactions',
		data: {
			currency: SHOP_CURRENCY.code,
			customer: customer.id,
			paymentMethod: 'manual',
			manual: {
				reference: 'SEED-0002'
			},
			status: 'succeeded',
			billingAddress: baseAddressUSData
		}
	});

	let succeededTransactionID: number | string = succeededTransaction.id;

	if (payload.db.defaultIDType === 'text') {
		succeededTransactionID = `"${succeededTransactionID}"`;
	}

	payload.logger.info(`— Seeding carts...`);

	// This cart is open as it's created now
	const openCart = await payload.create({
		collection: 'carts',
		data: {
			customer: customer.id,
			currency: SHOP_CURRENCY.code,
			items: [
				{
					product: productTshirt.id,
					variant: mediumTshirtHoodieVariant.id,
					quantity: 1
				}
			]
		}
	});

	const oldTimestamp = new Date('2023-01-01T00:00:00Z').toISOString();

	// Cart is abandoned because it was created long in the past
	const abandonedCart = await payload.create({
		collection: 'carts',
		data: {
			currency: SHOP_CURRENCY.code,
			createdAt: oldTimestamp,
			items: [
				{
					product: productHat.id,
					quantity: 1
				}
			]
		}
	});

	// Cart is purchased because it has a purchasedAt date
	const completedCart = await payload.create({
		collection: 'carts',
		data: {
			customer: customer.id,
			currency: SHOP_CURRENCY.code,
			purchasedAt: new Date().toISOString(),
			subtotal: 7499,
			items: [
				{
					product: productTshirt.id,
					variant: smallTshirtHoodieVariant.id,
					quantity: 1
				},
				{
					product: productTshirt.id,
					variant: mediumTshirtHoodieVariant.id,
					quantity: 1
				}
			]
		}
	});

	let completedCartID: number | string = completedCart.id;

	if (payload.db.defaultIDType === 'text') {
		completedCartID = `"${completedCartID}"`;
	}

	payload.logger.info(`— Seeding orders...`);

	const orderInCompleted = await payload.create({
		collection: 'orders',
		context: { disableOrderEmails: true },
		data: {
			amount: 7499,
			currency: SHOP_CURRENCY.code,
			customer: customer.id,
			shippingAddress: baseAddressUSData,
			items: [
				{
					product: productTshirt.id,
					variant: smallTshirtHoodieVariant.id,
					quantity: 1
				},
				{
					product: productTshirt.id,
					variant: mediumTshirtHoodieVariant.id,
					quantity: 1
				}
			],
			status: 'completed',
			paymentStatus: 'paid',
			transactions: [succeededTransaction.id]
		}
	});

	const orderInProcessing = await payload.create({
		collection: 'orders',
		context: { disableOrderEmails: true },
		data: {
			amount: 7499,
			currency: SHOP_CURRENCY.code,
			customer: customer.id,
			shippingAddress: baseAddressUSData,
			items: [
				{
					product: productTshirt.id,
					variant: smallTshirtHoodieVariant.id,
					quantity: 1
				},
				{
					product: productTshirt.id,
					variant: mediumTshirtHoodieVariant.id,
					quantity: 1
				}
			],
			status: 'processing',
			paymentStatus: 'awaiting-payment',
			paymentReference: 'SEED-0001',
			transactions: [succeededTransaction.id]
		}
	});
}
