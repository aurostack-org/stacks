---
name: add-screen
description: Add a screen to one of this monorepo's apps — the route, its data through the shared RTK Query baseApi, loading/empty/error states, forms, page meta and the app's nav entry — built from the shared UI kit. Use when asked to "build the X page", "add a /things screen", "implement this design", or to turn an artboard into a working route.
---

# Add a screen

First decide **which app** it belongs to. Each has its own router, nav and
origin:

- the signed-in product: `apps/client` <!-- @feature app-client -->
- the console: `apps/admin`, see `add-admin-page` <!-- @feature app-admin -->
- public pages: `apps/landing`, see `add-marketing-page` <!-- @feature app-landing -->

## 1. The data first

If the screen reads or writes API data, the endpoint must exist on the API.
<!-- @feature:start types -->
Generate its types: with the API running, set `API_DOC_URL`, `API_DOC_USER`
and `API_DOC_PASSWORD` (in `packages/types/.env`), run
`yarn workspace @acme/types gen`, and commit `packages/types/src/types/api/`.
<!-- @feature:end -->

The slice lives with the screen that owns it, in
`apps/<app>/src/features/<things>/api.ts`, or in `packages/api` if more than
one app calls it:

```ts
import { baseApi } from '@acme/api';
import type { ThingEntity, PaginatedThingEntity } from '@acme/types'; // @feature types

export const thingsApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		listThings: build.query<PaginatedThingEntity, { page?: number }>({
			query: (params) => ({ url: '/v1/things', params }),
			providesTags: ['Things']
		})
	})
});
export const { useListThingsQuery } = thingsApi;
```

Add `'Things'` to `tagTypes` in `packages/api/src/base-api.ts`: one global
namespace across every app.

## 2. The route

`apps/<app>/src/routes/things.tsx`, a named `ThingsRoute` export, with
`<PageMeta title="Things" />` from `@acme/ui` and every state the design
shows: `PageSkeleton` while loading, `Empty` with no data, `StateScreen` on
error (from `@acme/layouts`). Compose from `@acme/ui` and theme utilities; a
missing component is added to the kit with `add-component`, not inlined.
Forms use Formik with `toFormikValidationSchema(...)` and the `@acme/ui` form
fields. Lay it out for phone width too.

## 3. Register it

In `apps/<app>/src/app/router.tsx`: a lazy import and a child of the app's
branch (`{ path: 'things', element: lazyRoute(<ThingsRoute />) }`). Then the
nav entry in `apps/<app>/src/app/nav.tsx`
(`{ to: '/things', label: 'Things', icon: <Box className="size-4" /> }`).
Paths are the app's own; another app links to it through its host
(`VITE_APP_CLIENT_HOST` and friends), never a relative path.

## 4. Check

`yarn lint && yarn typecheck`, then `yarn workspace <app> dev` and walk every
state against the design at desktop and phone width.
