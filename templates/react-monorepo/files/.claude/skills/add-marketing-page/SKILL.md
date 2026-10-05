---
name: add-marketing-page
description: Add a public, indexable page to this monorepo's marketing app (apps/landing) — the route, its entry in the SEO route table that drives the sitemap, and its page meta. Use when asked to "add a pricing/about/features page", "a landing page for X", or any public page that should appear in search.
---

# Add a marketing page

`apps/landing` is public: no guard, its own origin. Its pages render inside the
marketing layout built from `Section` and `SectionHeading` (`@acme/layouts`);
`apps/landing/src/routes/home.tsx` is the example.

1. **The page**, `apps/landing/src/routes/<name>.tsx`, composed from
   `Section` / `SectionHeading` and kit components, with `PageMeta` (title,
   description, canonical) taken from its SEO entry below.

2. **Register it** as a child in `apps/landing/src/app/router.tsx` (lazy
   import, path like `pricing`).

3. **Its SEO entry**, in `SEO_ROUTES` in
   `apps/landing/src/features/seo/routes.ts`, in the same change:
   `{ path: '/pricing', title, description, priority, changefreq }`. This table
   is the single source for `sitemap.xml`. That file stays free of React and
   `import.meta.env`: the app's `vite.config.ts` imports it.

4. **Production origin**: `PRODUCTION_ORIGIN` there must equal the landing
   app's production URL, or the build marks every page `noindex`. Other
   origins are noindexed on purpose.

5. **Links into the product** (sign up, sign in) go to the other apps' hosts
   (`VITE_APP_AUTH_HOST`, `VITE_APP_CLIENT_HOST`), not relative paths.

6. **Check**: `yarn workspace landing build`, then look at its
   `dist/sitemap.xml` and the page's title, description and canonical.
