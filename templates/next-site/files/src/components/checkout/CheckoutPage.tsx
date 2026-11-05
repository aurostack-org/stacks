'use client';

import { Media } from '@/components/Media';
import { Message } from '@/components/Message';
import { Price } from '@/components/Price';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/Auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { useAddresses, useCart, usePayments } from '@payloadcms/plugin-ecommerce/client/react';
import { CheckoutAddresses } from '@/components/checkout/CheckoutAddresses';
import { CreateAddressModal } from '@/components/addresses/CreateAddressModal';
import type { Address, Product, Variant } from '@/payload-types';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressItem } from '@/components/addresses/AddressItem';
import { FormItem } from '@/components/forms/FormItem';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { priceOf } from '@/lib/currency';

type GalleryItem = NonNullable<Product['gallery']>[number];
type VariantOptionRef = NonNullable<Variant['options']>[number];

export const CheckoutPage: React.FC<{ paymentInstructions?: string | null }> = ({ paymentInstructions }) => {
	const { user } = useAuth();
	const router = useRouter();
	const { cart } = useCart();
	const [error, setError] = useState<null | string>(null);
	/**
	 * State to manage the email input for guest checkout.
	 */
	const [email, setEmail] = useState('');
	const [emailEditable, setEmailEditable] = useState(true);
	const { initiatePayment, confirmOrder } = usePayments();
	const { addresses } = useAddresses();
	const [shippingAddress, setShippingAddress] = useState<Partial<Address>>();
	const [billingAddress, setBillingAddress] = useState<Partial<Address>>();
	const [billingAddressSameAsShipping, setBillingAddressSameAsShipping] = useState(true);
	const [isPlacingOrder, setPlacingOrder] = useState(false);

	const cartIsEmpty = !cart || !cart.items || !cart.items.length;

	const canGoToPayment = Boolean(
		(email || user) && billingAddress && (billingAddressSameAsShipping || shippingAddress)
	);

	// On initial load wait for addresses to be loaded and check to see if we can prefill a default one
	useEffect(() => {
		if (!shippingAddress) {
			if (addresses && addresses.length > 0) {
				const defaultAddress = addresses[0];
				if (defaultAddress) {
					setBillingAddress(defaultAddress);
				}
			}
		}
	}, [addresses]);

	useEffect(() => {
		return () => {
			setShippingAddress(undefined);
			setBillingAddress(undefined);
			setBillingAddressSameAsShipping(true);
			setEmail('');
			setEmailEditable(true);
		};
	}, []);

	const placeOrder = useCallback(async () => {
		setError(null);
		setPlacingOrder(true);
		try {
			const shipping = billingAddressSameAsShipping ? billingAddress : shippingAddress;
			const initiated = (await initiatePayment('manual', {
				additionalData: {
					...(email ? { customerEmail: email } : {}),
					billingAddress,
					shippingAddress: shipping
				}
			})) as Record<string, unknown>;

			const result = (await confirmOrder('manual', {
				additionalData: {
					...(email ? { customerEmail: email } : {}),
					reference: initiated?.reference
				}
			})) as Record<string, unknown>;

			if (!result?.orderID) throw new Error('The order could not be placed.');

			const query = new URLSearchParams();
			if (email) query.set('email', email);
			if (typeof result.accessToken === 'string') query.set('accessToken', result.accessToken);
			const qs = query.toString();
			router.push(`/orders/${result.orderID}${qs ? `?${qs}` : ''}`);
		} catch (error) {
			let errorData: any = {};
			try {
				errorData = error instanceof Error ? JSON.parse(error.message) : {};
			} catch {
				// Not a JSON error body; fall through to the generic message.
			}
			const errorMessage =
				errorData?.cause?.code === 'OutOfStock'
					? 'One or more items in your cart are out of stock.'
					: 'Something went wrong placing your order. Please try again.';

			setError(errorMessage);
			toast.error(errorMessage);
			setPlacingOrder(false);
		}
	}, [billingAddress, billingAddressSameAsShipping, confirmOrder, email, initiatePayment, router, shippingAddress]);

	if (cartIsEmpty && isPlacingOrder) {
		return (
			<div className="py-12 w-full items-center justify-center">
				<div className="prose dark:prose-invert text-center max-w-none self-center mb-8">
					<p>Placing your order...</p>
				</div>
				<LoadingSpinner />
			</div>
		);
	}

	if (cartIsEmpty) {
		return (
			<div className="prose dark:prose-invert py-12 w-full items-center">
				<p>Your cart is empty.</p>
				<Link href="/shop">Continue shopping?</Link>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-stretch justify-stretch my-8 md:flex-row grow gap-10 md:gap-6 lg:gap-8">
			<div className="basis-full lg:basis-2/3 flex flex-col gap-8 justify-stretch">
				<h2 className="font-medium text-3xl">Contact</h2>
				{!user && (
					<div className=" bg-accent rounded-lg p-4 w-full flex items-center">
						<div className="prose dark:prose-invert">
							<Button asChild className="no-underline text-inherit" variant="outline">
								<Link href="/login">Log in</Link>
							</Button>
							<p className="mt-0">
								<span className="mx-2">or</span>
								<Link href="/create-account">create an account</Link>
							</p>
						</div>
					</div>
				)}
				{user ? (
					<div className="bg-accent dark:bg-card rounded-lg p-4 ">
						<div>
							<p>{user.email}</p>{' '}
							<p>
								Not you?{' '}
								<Link className="underline" href="/logout">
									Log out
								</Link>
							</p>
						</div>
					</div>
				) : (
					<div className="bg-accent rounded-lg p-4 ">
						<div>
							<p className="mb-4">Enter your email to checkout as a guest.</p>

							<FormItem className="mb-6">
								<Label htmlFor="email">Email Address</Label>
								<Input
									disabled={!emailEditable}
									id="email"
									name="email"
									onChange={(e) => setEmail(e.target.value)}
									required
									type="email"
								/>
							</FormItem>

							<Button
								disabled={!email || !emailEditable}
								onClick={(e) => {
									e.preventDefault();
									setEmailEditable(false);
								}}
								variant="primary"
							>
								Continue as guest
							</Button>
						</div>
					</div>
				)}

				<h2 className="font-medium text-3xl">Address</h2>

				{billingAddress ? (
					<div>
						<AddressItem
							actions={
								<Button
									variant={'outline'}
									disabled={isPlacingOrder}
									onClick={(e) => {
										e.preventDefault();
										setBillingAddress(undefined);
									}}
								>
									Remove
								</Button>
							}
							address={billingAddress}
						/>
					</div>
				) : user ? (
					<CheckoutAddresses heading="Billing address" setAddress={setBillingAddress} />
				) : (
					<CreateAddressModal
						disabled={!email || Boolean(emailEditable)}
						callback={(address) => {
							setBillingAddress(address);
						}}
						skipSubmission={true}
					/>
				)}

				<div className="flex gap-4 items-center">
					<Checkbox
						id="shippingTheSameAsBilling"
						checked={billingAddressSameAsShipping}
						disabled={isPlacingOrder || (!user && (!email || Boolean(emailEditable)))}
						onChange={(event) => setBillingAddressSameAsShipping(event.target.checked)}
					/>
					<Label htmlFor="shippingTheSameAsBilling">Shipping is the same as billing</Label>
				</div>

				{!billingAddressSameAsShipping && (
					<>
						{shippingAddress ? (
							<div>
								<AddressItem
									actions={
										<Button
											variant={'outline'}
											disabled={isPlacingOrder}
											onClick={(e) => {
												e.preventDefault();
												setShippingAddress(undefined);
											}}
										>
											Remove
										</Button>
									}
									address={shippingAddress}
								/>
							</div>
						) : user ? (
							<CheckoutAddresses
								heading="Shipping address"
								description="Please select a shipping address."
								setAddress={setShippingAddress}
							/>
						) : (
							<CreateAddressModal
								callback={(address) => {
									setShippingAddress(address);
								}}
								disabled={!email || Boolean(emailEditable)}
								skipSubmission={true}
							/>
						)}
					</>
				)}

				<h2 className="font-medium text-3xl">Payment</h2>
				<div className="bg-accent dark:bg-card rounded-lg p-4 flex flex-col gap-2">
					<p className="font-medium">Pay on delivery or by transfer</p>
					{paymentInstructions && <p className="whitespace-pre-line text-sm">{paymentInstructions}</p>}
					<p className="text-sm text-muted-foreground">You will get a payment reference once the order is placed.</p>
				</div>

				{error && <Message error={error} />}

				<Button
					className="self-start"
					disabled={!canGoToPayment || isPlacingOrder}
					onClick={(e) => {
						e.preventDefault();
						void placeOrder();
					}}
				>
					{isPlacingOrder ? 'Placing order…' : 'Place order'}
				</Button>
			</div>

			{!cartIsEmpty && (
				<div className="basis-full lg:basis-1/3 lg:pl-8 p-8 border-none bg-muted flex flex-col gap-8 rounded-lg">
					<h2 className="text-3xl font-medium">Your cart</h2>
					{cart?.items?.map((item, index) => {
						if (typeof item.product === 'object' && item.product) {
							const {
								product,
								product: { id, meta, title, gallery },
								quantity,
								variant
							} = item;

							if (!quantity) return null;

							let image = gallery?.[0]?.image || meta?.image;
							let price = priceOf(product);

							const isVariant = Boolean(variant) && typeof variant === 'object';

							if (isVariant) {
								price = priceOf(variant);

								const imageVariant = product.gallery?.find((item: GalleryItem) => {
									if (!item.variantOption) return false;
									const variantOptionID =
										typeof item.variantOption === 'object' ? item.variantOption.id : item.variantOption;

									const hasMatch = variant?.options?.some((option: VariantOptionRef) => {
										if (typeof option === 'object') return option.id === variantOptionID;
										else return option === variantOptionID;
									});

									return hasMatch;
								});

								if (imageVariant && typeof imageVariant.image !== 'string') {
									image = imageVariant.image;
								}
							}

							return (
								<div className="flex items-start gap-4" key={index}>
									<div className="flex items-stretch justify-stretch h-20 w-20 p-2 rounded-lg border">
										<div className="relative w-full h-full">
											{image && typeof image !== 'string' && (
												<Media className="" fill imgClassName="rounded-lg" resource={image} />
											)}
										</div>
									</div>
									<div className="flex grow justify-between items-center">
										<div className="flex flex-col gap-1">
											<p className="font-medium text-lg">{title}</p>
											{variant && typeof variant === 'object' && (
												<p className="text-sm font-mono text-muted-foreground tracking-widest">
													{variant.options
														?.map((option: VariantOptionRef) => {
															if (typeof option === 'object') return option.label;
															return null;
														})
														.join(', ')}
												</p>
											)}
											<div>
												{'x'}
												{quantity}
											</div>
										</div>

										{typeof price === 'number' && <Price amount={price} />}
									</div>
								</div>
							);
						}
						return null;
					})}
					<hr />
					<div className="flex justify-between items-center gap-2">
						<span className="uppercase">Total</span>{' '}
						<Price className="text-3xl font-medium" amount={cart.subtotal || 0} />
					</div>
				</div>
			)}
		</div>
	);
};
