import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types';

import { manualAdapter } from './manual';

/**
 * Every payment method the shop offers, server side. To add a provider, write
 * an adapter in `src/payments/<provider>/` (see `manual/` for the shape), add
 * it here and to `client.ts`, and give checkout a way to start it. The
 * add-payment-provider skill walks through it.
 */
export const paymentMethods: PaymentAdapter[] = [manualAdapter()];
