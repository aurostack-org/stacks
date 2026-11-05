import type { PaymentAdapterClient } from '@payloadcms/plugin-ecommerce/types';

import { manualAdapterClient } from './manual/client';

/** The browser-side list matching `paymentMethods` in ./index.ts, by name. */
export const paymentMethodsClient: PaymentAdapterClient[] = [manualAdapterClient()];
