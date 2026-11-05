import type { CurrenciesConfig, Currency } from '@payloadcms/plugin-ecommerce/types';

/**
 * The one currency the shop sells in. The ecommerce plugin stores a product's
 * price in a column named after it (`priceInGHS`), so choose it before the
 * first migration: changing it later is a schema change, and existing prices
 * stay in the old column.
 *
 * To change it, edit `code`, `label`, `symbol` and SHOP_LOCALE here, then run
 * `yarn generate:types` and `yarn generate:importmap`.
 */
export const SHOP_CURRENCY = {
	code: 'GHS',
	decimals: 2,
	label: 'Ghana Cedi',
	symbol: 'GH₵'
} as const satisfies Currency;

/** How prices are written. `en-GH` gives `GH₵25.00`; plain `en` would give `GHS 25.00`. */
export const SHOP_LOCALE = 'en-GH';

export const currenciesConfig: CurrenciesConfig = {
	defaultCurrency: SHOP_CURRENCY.code,
	supportedCurrencies: [SHOP_CURRENCY]
};

/** The product and variant field that holds the price, e.g. `priceInGHS`. */
export const PRICE_FIELD = `priceIn${SHOP_CURRENCY.code}` as const;

/** A product's or variant's price in minor units (pesewas), if it has one. */
export function priceOf(doc: unknown): number | undefined {
	if (!doc || typeof doc !== 'object') return undefined;
	const value = (doc as Record<string, unknown>)[PRICE_FIELD];
	return typeof value === 'number' ? value : undefined;
}

/** The checkbox that turns a price on for a product or variant. */
export const PRICE_ENABLED_FIELD = `${PRICE_FIELD}Enabled` as const;
