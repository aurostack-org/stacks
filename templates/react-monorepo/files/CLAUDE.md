# acme

A Yarn workspaces + Turborepo frontend generated from the stacks
`react-monorepo` template (`stack.json` records which features it has): one
Vite + React 19 app per deployment under `apps/`, sharing the packages under
`packages/`. Each app is its own origin; the session cookie is shared across
them through the API's cookie domain.

## Commands

```sh
yarn dev                             # every app (turbo)
yarn workspace <app> dev            # one app, by its directory name under apps/
yarn lint && yarn typecheck && yarn build   # turbo, across everything (what CI runs)
yarn format:check
yarn workspace @acme/types gen       # regenerate API types from the running API <!-- @feature types -->
```

There is no test runner yet.

## Layout

<!-- @feature:start app-auth -->
- `apps/auth/`: sign-in, sign-up, reset and verify screens, on their own
  origin.
<!-- @feature:end -->
<!-- @feature:start app-client -->
- `apps/client/`: the signed-in product.
<!-- @feature:end -->
<!-- @feature:start app-admin -->
- `apps/admin/`: the role-gated console.
<!-- @feature:end -->
<!-- @feature:start app-landing -->
- `apps/landing/`: the public marketing site and its SEO table.
<!-- @feature:end -->
- Each app: `src/app/` (`router.tsx`, `nav.tsx`, `providers.tsx`), `src/routes/`
  (one file per screen, a named `XRoute` export), `src/lib/`, and
  `src/features/<name>/` for a feature's API slice and private components.
- `packages/ui` (the kit, theme, `PageMeta`), `packages/api` (`baseApi`, base
  query, uploads), `packages/auth` (session, guards, cross-origin redirects),
  `packages/layouts` (shells, state screens), `packages/hooks`,
  `packages/types` (generated API types), `packages/telemetry`,
  `packages/config` (shared Vite, TypeScript, ESLint and Tailwind config,
  including the brand tokens in `tailwind/theme.css`).
- Shared code is imported by package name (`@acme/ui`, `@acme/api`); inside
  an app, relative imports.

## Rules

- **Shared means a package.** Code two apps use goes into a package, never
  copied between apps. App-specific code stays in its app.
- **Tokens, not literals.** Colours, radii and fonts come from the theme
  (`packages/ui/src/styles/globals.css`, `packages/config/tailwind/theme.css`):
  `bg-card`, `text-muted-foreground`, `border-border`. No hex values in
  components. `THEME_COLORS` must equal `--background`.
- **One `baseApi`** in `packages/api`. Every endpoint is
  `baseApi.injectEndpoints(...)`; cache tags are one global namespace, added
  to `tagTypes` in `packages/api/src/base-api.ts` with specific names.
<!-- @feature:start types -->
- **Generated types are the contract.** Types from `@acme/types` (Zod
  schemas from `@acme/types/zod`), never hand-written copies. Regenerate after
  the API changes and commit the output.
<!-- @feature:end -->
- **The guards are UI, not security**, and signing in happens on the auth
  app's origin: an unauthenticated request redirects there
  (`VITE_APP_AUTH_HOST`). The app hosts (`VITE_APP_*_HOST`) must agree with
  the API's `FRONTEND_HOST` / `MISC_CORS_ORIGINS` and its
  `BETTER_AUTH_COOKIE_DOMAIN`, or sign-in bounces.
- **`VITE_*` is inlined at build time**, per app: a built image is pinned to
  one environment, and nothing secret may be a `VITE_*` variable.
- **`PageMeta` on every screen**; admin and error pages pass
  `robots="noindex"`.
- A new component package needs an `@source` line in
  `packages/ui/src/styles/globals.css`, or Tailwind never sees its classes.

## Features in this project

- **Forms**: Formik with Zod (`toFormikValidationSchema(schema)`) and the
  `FormField` / `FormTextarea` / `FormDateField` / `FormError` fields from
  `@acme/ui`.
- **Toasts**: `toast()` from `sonner`. **States**: `PageSkeleton`, `Empty`,
  `StateScreen` from `@acme/layouts`.
<!-- @feature:start realtime -->
- **Realtime**: the Socket.IO client in `packages/api/src/socket.ts`; see
  `add-realtime-listener`.
<!-- @feature:end -->
<!-- @feature:start charts -->
- **Charts** (client app): ApexCharts, no wrapper yet. Lazy-load it. Colour by
  identity with `--chart-1` … `--chart-6` and `--chart-other` (never a seventh
  hue); one magnitude series uses `--chart-bar`.
<!-- @feature:end -->
<!-- @feature:start pwa -->
- **PWA** (client app): `vite-plugin-pwa` with `registerType: 'prompt'`; the
  update prompt and install button are yours to build with `useRegisterSW`.
  Keep `prompt`, and do not add an API runtime cache without deciding what
  stale data means.
<!-- @feature:end -->

## Skills

- `add-screen`: a route in one of the apps, with its data and states.
- `add-component`: a component in the shared UI kit.
- `add-admin-page`: a page in the admin console. <!-- @feature app-admin -->
- `add-marketing-page`: a public, indexable page. <!-- @feature app-landing -->
- `add-realtime-listener`: react to a server event. <!-- @feature realtime -->
