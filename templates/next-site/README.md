# next-site

A Next.js 16 app with Payload CMS 3 built in, on Postgres: the house template
for small client sites that the client edits themselves. A business website by
default; `--with shop` adds a store.

```
stack new next-site ~/Projects/kofi-bakery
stack new next-site ~/Projects/ama-shop --with shop
```

Unlike the other frontends it has no separate API: Payload runs inside Next,
owns the schema and migrations (Drizzle under its Postgres adapter, not
Prisma), and has its own auth (`users`, plus customers with the shop). Use
`react-app` + `nest-api` when the product needs a real backend; use this when
the product is the site.

## Where it comes from

Payload's official `ecommerce` starter at **v3.93.0** (MIT), reworked into
this template. The headline changes from the starter:

- MongoDB → Postgres; pnpm → Yarn 4 (node-modules linker); Next 16.4.
- Stripe removed. Payments are adapters in `src/payments/`; the bundled
  `manual` method creates the order as awaiting payment, shows the owner's
  instructions (Shop settings global), emails both sides, and the owner marks
  it paid. Orders carry `paymentStatus` separately from fulfilment `status`.
- One currency, GHS by default, set in `src/lib/currency.ts`.
- Storefront pages render per request (`force-dynamic`); header, footer and
  redirects are read per request with React `cache()`. The starter cached the
  header and footer with `unstable_cache` and never revalidated them.
- Starter branding removed (Payload logo, "Designed in Michigan", OG defaults,
  a contact form sending from `demo@payloadcms.com`); the owner uploads a logo.
- Seeding refuses to run in production (it deletes all content), and reads
  its images from local files instead of Payload's moving `3.x` branch.
- Payload's ethereal.email fallback is replaced: with no `SMTP_HOST`, emails
  go to the server log.
- Search and redirects plugins added; Docker standalone image, OpenTelemetry
  and OpenObserve RUM, Infisical, husky and Forgejo CI as in the other
  templates.

## Working on it

`files/` is the source: edit it in place, run it in place. With every feature
on, it is a working site.

```sh
cd templates/next-site/files
touch yarn.lock              # a project of its own, not part of the stacks repo
yarn install
yarn env:init                # .env with fresh secrets
docker compose up -d database
yarn dev                     # http://localhost:3000, /admin, Seed on the dashboard
yarn typecheck && yarn lint && yarn format:check && yarn build
yarn test:int                # against DATABASE_URL; use a scratch database
```

What a run leaves behind (`.next/`, `media/`, `next-env.d.ts`, `AGENTS.md`,
`yarn.lock`, `node_modules/`, `.env`) is ignored by the stacks `.gitignore`.
Delete `node_modules` when done; it is large. Then:

```sh
stack doctor next-site       # markers, feature files, imports per selection
```

and generate the variants CI builds (`.github/workflows/ci.yml`, job
`next-site`) when a change touches a feature seam. After a change to a
collection, global, field or admin component, run `yarn generate:types &&
yarn generate:importmap` and commit `src/payload-types.ts` and
`src/app/(payload)/admin/importMap.js`: they are the all-features versions
that generation starts from.

There is no extraction step and no `stacks.local.json` entry. When a client
site built from this template improves something generic, fold it back by
hand with the stack-sync skill's judgement about what is generic.

## Feature seams

Shared files reach shop-only code through annotated indirections rather than
markers inside JSX: `featureProviders` in `src/providers/index.tsx`, `actions`
in the header, `accountMenus` in the mobile menu, the block and plugin
registries, `tips` on the dashboard. Follow the same pattern for a new
feature; an inline marker on a JSX line strips its comment's closing brace too.

## Generated files

`src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` depend on
which plugins are enabled. The template ships the all-features versions; the
`regenerate Payload types` hook rewrites both for the project's selection
(`stack add` reruns it), and neither needs a database.

## Upgrading Payload

Bump every `@payloadcms/*` and `payload` in `files/package.json` to the same
version, check `next`'s peer range (`npm view @payloadcms/next@<v>
peerDependencies`), diff Payload's `templates/ecommerce` between the two tags
for fixes worth taking, and run the checks and `yarn test:int` in place.
