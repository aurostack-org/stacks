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

Payload's official `ecommerce` starter at **v3.93.0** (MIT), reworked in a
source repository and extracted here. That source is the place to work:

```sh
# stacks.local.json → sources.next-site.path, e.g. ~/Projects/aurostack/next-site
stack extract next-site --overwrite --prune
stack doctor next-site
```

Unusually, the feature markers live **in the source repository**, not only in
the template: they are comments, so the source still runs with every feature
on, and extraction copies them through. That is why `--overwrite` is the
normal way to extract here rather than a last resort. Do not hand-edit files
under `files/`; change the source and extract.

What changed from the starter, and why, is in the source's git history. The
headline changes:

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

Bump every `@payloadcms/*` and `payload` to the same version in the source,
check `next`'s peer range (`npm view @payloadcms/next@<v> peerDependencies`),
diff Payload's `templates/ecommerce` between the two tags for fixes worth
taking, run the source's `yarn test:int` against Postgres, then extract.
