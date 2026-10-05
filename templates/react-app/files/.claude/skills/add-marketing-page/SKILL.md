---
name: add-marketing-page
description: Add a public, indexable page to this app's marketing site — the route under MarketingLayout, its entry in the SEO route table that drives the sitemap, and its page meta. Use when asked to "add a pricing/about/features page", "a landing page for X", or any public page that should appear in search.
---

# Add a marketing page

The marketing site owns `/` (the signed-in app lives under `APP_BASE`, see
`src/lib/paths.ts`). Its pages render inside `MarketingLayout`, built from
`Section` and `SectionHeading`; `src/routes/marketing/home.tsx` is the example.

1. **The page**, `src/routes/marketing/<name>.tsx`, composed from `Section` /
   `SectionHeading` and kit components, with `PageMeta` (title, description,
   canonical) taken from its SEO entry below.

2. **Register it** as a child of the marketing branch in `src/app/router.tsx`
   (lazy import, path like `pricing`).

3. **Add its SEO entry** to `SEO_ROUTES` in `src/features/seo/routes.ts`, in
   the same change: `{ path: '/pricing', title, description, priority, changefreq }`.
   This table is the single source for `sitemap.xml`; a page missing from it
   is not in the sitemap, and one listed without a route is a 404 search
   engines will find.

4. **Production origin**: `PRODUCTION_ORIGIN` in that file must equal
   `VITE_APP_SITE_URL` for the production build, or the build marks every
   page `noindex`. Other origins are noindexed on purpose.

5. **Check**: `yarn build`, then look at `dist/sitemap.xml` and the page's
   `<title>`, description and canonical in the built HTML.
