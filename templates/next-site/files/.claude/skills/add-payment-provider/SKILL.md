---
name: add-payment-provider
description: Add a payment method to this shop beside the built-in manual one — a server adapter for Payload's ecommerce plugin, its browser half, checkout UI to start it, and the order's paymentStatus — for a provider's hosted checkout (redirect to pay, then a callback). Use when asked to "take card payments", "add mobile money", "integrate <provider>", or "let customers pay online".
---

# Add a payment provider

Payment methods are adapters for Payload's ecommerce plugin. `manual` in
`src/payments/manual/` is the reference: read it first, all of it.

## The contract

An adapter (`PaymentAdapter` from `@payloadcms/plugin-ecommerce/types`) has:

- `name`: the method's id, also its URL segment: `/api/payments/<name>/…`.
- `initiatePayment`: called by `/initiate`. The plugin has already loaded the
  cart from the database and checked every price against the products, so
  `data.cart.subtotal` is trustworthy; never take an amount from the browser.
  Create a `transactions` document with `status: 'pending'`, start the payment
  with the provider, and return what the browser needs (a redirect URL).
- `confirmOrder`: called by `/confirm-order`. **Verify with the provider,
  server to server**, that the payment succeeded and the amount and currency
  match the transaction. Only then call `finalizeOrder` (exactly once), which
  creates the order, marks the cart purchased and takes the stock.
- `group`: fields for this method's ids on the transaction (the provider's
  reference, checkout id).
- `endpoints`: extra routes under `/api/payments/<name>/`, such as the
  provider's callback/webhook.

## The rules that matter

- **A callback is a hint, not proof.** Whatever the provider posts to your
  callback, re-query the provider's status API before trusting it; unsigned
  callbacks can be forged. If the provider signs them, verify the signature too.
- **Settle from every path, once.** A customer can close the tab after paying.
  Have the return page, the callback and (if the provider requires it) a
  scheduled status check all call the same verify-then-finalize function;
  `finalizeOrder` is idempotent per transaction, so calling it twice returns
  the same order.
- **Amounts are integers in minor units** (pesewas): `priceOf()` and
  `cart.subtotal` already are. Convert only at the provider's API boundary.
- **`paymentStatus`**: orders default to `paid`, which is right for a method
  that only finalizes after the provider confirms. Never finalize a hosted
  checkout before it is paid.
- Secrets (API keys) are server env only; never `NEXT_PUBLIC_*`. Add them to
  `.env.example` with a comment saying where to find them.

## Steps

1. `src/payments/<name>/index.ts` (server adapter) and `client.ts`
   (`PaymentAdapterClient`: `name`, `label`, `initiatePayment: true`,
   `confirmOrder: true`). Read keys from `process.env`.
2. Register in `src/payments/index.ts` and `src/payments/client.ts`.
3. Checkout: `src/components/checkout/CheckoutPage.tsx` calls
   `initiatePayment('<name>', …)`. For a hosted checkout, redirect the browser
   to the URL you returned, and give the provider a return URL that calls
   `confirmOrder('<name>', { additionalData: { reference } })` and then sends
   the customer to `/orders/<id>`. If both methods are offered, let the
   customer choose between them.
4. `yarn generate:types && yarn generate:importmap` (the `group` adds fields).
5. Test against the provider's sandbox, and add an integration test beside
   `tests/int/manual-payment.int.spec.ts`: a forged callback and a wrong amount
   must not create a paid order.
6. Before deploying: `yarn payload migrate:create add-<name>-payments`.
