# acme-site

A Next.js 16 site with Payload CMS 3 built in, generated from the stacks
`next-site` template (`stack.json` records which features it has). One app, no
separate backend: the public site is under `src/app/(app)`, the owner's admin
is `/admin`, and both run on one Postgres database through Payload's own
adapter.
<!-- @feature:start shop -->

It includes a shop: products with variants and stock, cart, checkout, customer
accounts and orders, through Payload's ecommerce plugin.
<!-- @feature:end -->

The people who edit this site are not developers. Anything they should be able
to change (text, images, menus, prices, payment instructions) belongs in the
admin, not in code.

## Commands

```sh
yarn dc:up               # Postgres + Mailpit (emails: http://localhost:8025)
yarn dev                 # http://localhost:3000, admin at /admin
yarn typecheck && yarn lint && yarn format:check
yarn build               # what CI runs, after the three above; needs no database
yarn generate:types      # after any change to a collection, global or field
yarn generate:importmap  # after adding an admin component (a path string in config)
yarn payload migrate:create <name>   # before deploying a schema change
yarn env:init            # create .env and fill empty secrets
yarn test:int            # integration tests against Postgres (DATABASE_URL) <!-- @feature testing -->
```

The first visit to `/admin` on an empty database creates the first user, who
is made an admin. The dashboard's Seed button fills a development database with
demo content and deletes what was there; it is disabled in production.

## Layout

- `src/payload.config.ts`: collections, globals, database, email, endpoints.
  `src/plugins/index.ts`: SEO, form builder and the other plugins.
- `src/collections/`, `src/globals/`: the content model. `src/access/`: the
  access rules they use. `src/hooks/`: field and collection hooks.
- `src/blocks/<Name>/`: page-builder blocks, each a `config.ts` (fields) and a
  `Component.tsx` (rendering), registered in `src/collections/Pages/index.ts`
  and `src/blocks/RenderBlocks.tsx`. `src/heros/`: the page hero variants.
- `src/app/(app)/`: the public site. `[slug]/page.tsx` renders any CMS page;
  `/` is the page with slug `home`. `src/app/(payload)/`: the admin and the
  REST/GraphQL API at `/api`; generated, leave it alone.
- `src/components/`: site components; `src/components/ui/`: the UI kit.
- `src/endpoints/seed/`: demo content. `src/utilities/`: small helpers
  (`docPath` is where a page or product lives; `pageNotFound` is the 404 path).

<!-- @feature:start shop -->

- Shop: `src/collections/Products`, `src/collections/Orders`,
  `src/globals/ShopSettings.ts`, `src/payments/` (payment methods),
  `src/lib/currency.ts` (the one currency), storefront routes `shop/`,
  `products/`, `checkout/`, `(account)/`, `login/` and friends.

<!-- @feature:end -->

- Imports use `@/` for `src/`; `@payload-config` is the Payload config.

## Rules

- **Payload owns the schema.** There is no Prisma and no hand-written SQL.
  Change a collection or field, run `yarn generate:types`, and use the types
  in `src/payload-types.ts` (generated, committed, never edited by hand).
- **Migrations before deploy.** In development Payload pushes schema changes
  straight to the database. Production runs migrations instead: they run
  automatically when the server starts (`prodMigrations` in
  `payload.config.ts`), but only the ones that exist. So before deploying a
  schema change, run `yarn payload migrate:create <name>` against a database
  that has the previous schema and commit `src/migrations/`. A fresh project
  has none; create `initial` before the first deploy.
- **Access is enforced in the collection**, not the page. Every collection
  sets `access` (`src/access/`); a page that hides something from a visitor is
  not protecting it, because `/api` serves the same data.
- **Pages render per request.** `src/app/(app)/layout.tsx` sets
  `dynamic = 'force-dynamic'`: the Docker image is built without a database,
  and an owner's edit must show on the next page view. Do not add
  `generateStaticParams` or `unstable_cache` around Payload reads; use
  React's `cache()` for per-request reuse, as `getGlobal` does.
- **`NEXT_PUBLIC_*` is inlined at build time**, in the browser bundle and the
  server alike. A built image is pinned to one `NEXT_PUBLIC_SERVER_URL`, and
  nothing secret may be a `NEXT_PUBLIC_*` variable.
- **Uploads live in `MEDIA_DIR`** (`./media` locally, a volume at
  `/app/media` in Docker), served through `/api/media/file/*`. Never under
  `public/`.
- **Email never leaves without SMTP.** With `SMTP_HOST` unset, emails are
  written to the server log instead (`src/utilities/mailTransport.ts`). Do not
  reintroduce Payload's ethereal.email fallback.
- **No developer branding on the site.** Names and logos come from the admin
  (Header → Logo) or `SITE_NAME`; the dashboard text in
  `src/components/BeforeDashboard` is written for the owner.

<!-- @feature:start shop -->

- **One currency.** `src/lib/currency.ts` sets it (GHS by default) and the
  price field it implies (`priceInGHS`); read prices with `priceOf()`, never a
  hardcoded field name. Changing currency after the first migration is a
  schema change.
- **An order is not money.** With the `manual` method an order exists before
  anyone has paid: `paymentStatus` (`awaiting-payment`, `paid`, `refunded`)
  says whether money arrived; `status` is fulfilment. Never ship, email a
  download, or mark something sold on `status` alone. The plugin marks the
  _transaction_ `succeeded` as soon as the order is created; that means
  "settled into an order", not "paid".
- **Payment methods are adapters** in `src/payments/<name>/`, listed in
  `src/payments/index.ts` and `client.ts`. Use the add-payment-provider skill.

<!-- @feature:end -->

## Deploying

The Docker image (`Dockerfile`, `build.sh`) is one Node server. It needs
`DATABASE_URL`, `PAYLOAD_SECRET` and SMTP settings at runtime, a volume at
`/app/media`, and `NEXT_PUBLIC_SERVER_URL` as a build argument. `/api/health`
answers 200 when the server and database are up.
<!-- @feature:start telemetry -->

Monitoring stays off until `OPENOBSERVE_*` (server) and
`NEXT_PUBLIC_OPENOBSERVE_*` (browser, a RUM token) are set; see `.env.example`.
<!-- @feature:end -->

## Skills

- `add-block`: a new page-builder block the owner can place on any page.
- `add-collection`: a new kind of content in the admin.

<!-- @feature:start shop -->

- `add-payment-provider`: a payment method beside `manual`, such as a
  provider's hosted checkout page.

<!-- @feature:end -->
