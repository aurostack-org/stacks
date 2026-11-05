import type { PaymentAdapterClient } from '@payloadcms/plugin-ecommerce/types';

/** Browser half of the manual adapter: tells the cart which steps exist. */
export const manualAdapterClient = (props?: { label?: string }): PaymentAdapterClient => ({
	name: 'manual',
	label: props?.label || 'Pay on delivery or by transfer',
	initiatePayment: true,
	confirmOrder: true
});
