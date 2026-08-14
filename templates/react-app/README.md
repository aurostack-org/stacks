# react-app

The `react-monorepo` stack collapsed into a single Vite app: one build, one
image, one origin.

```
stack new react-app ~/Projects/acme/web --with marketing,admin
```

## Layout of a generated project

```
src/
├── main.tsx
├── app/            providers · router · store · nav
├── lib/            env · paths
├── shared/         ui · api · auth · layouts · hooks · types
├── features/       auth (screens' components + actions) · seo
└── routes/         home · settings · auth/* · legal/* · marketing/* · admin/*
```

`@/` resolves to `src/` (Vite alias + tsconfig `paths`), so `@/shared/ui` is
what `@scope/ui` was in the monorepo. Nothing else about the code changes.

## Where it deliberately differs from the monorepo

One origin instead of four, which changes three things and nothing else:

- **The session guard navigates.** `ProtectedRoute` renders `<Navigate to="/login?redirect=…" replace />`
  rather than assigning `window.location`. The login screen is in this same
  bundle, so a full page load would re-download and re-boot the app to show a
  screen it already has. The 401 handler still does a hard load, because it fires
  from outside React and discarding in-memory state is the point there.
- **`trustedOrigins` defaults to this origin.** The open-redirect allowlist stays
  — `?redirect=` is still attacker-controllable — but there is nothing to add to
  it unless you deliberately hand off to another host.
- **Absolute URLs come from the browser**, not from env. `APP_ORIGIN` is
  `window.location.origin`. The only place an absolute URL is genuinely needed is
  a link that lands in an email, and a build-time `VITE_APP_URL` can only be
  wrong there — a stale value baked into an image sends verification links to the
  previous environment, invisibly, until someone clicks one.

## Where the app is mounted

`src/lib/paths.ts` owns this. With the `marketing` feature the landing page owns
`/` and the authenticated app moves to `/app`; without it, the app owns the root.
The router, the nav and the post-login redirect all read `appPath()`, so they
cannot disagree.

Routes *inside* the app shell stay relative and need none of this.

The legal pages (`/terms`, `/privacy`) ship either way, on purpose: the signup
consent gate links to them, and a checkbox that says "I agree to the Terms" over
a 404 is not consent.

## Maintaining it

The shared packages and the page components are the *same source* as
`react-monorepo` — only their location and their import specifiers differ. Don't
edit them here.

```sh
bash templates/react-app/derive.sh      # re-flatten from react-monorepo
stack doctor react-app                  # always, afterwards
```

`derive.sh` rebuilds `src/shared`, `src/features/{auth,seo}`,
`src/routes/{auth,marketing}` from scratch each run, then copies `overrides/` on
top. Anything in `overrides/` is a file that genuinely differs in a monolith —
that directory listing *is* the list of intentional divergences, and it is short
by design.

Everything else (`app/`, `lib/`, `vite.config.ts`, `package.json`, `Dockerfile`)
is hand-written here and untouched by the script.

So: a fix to a UI component or an auth screen goes into `react-monorepo` and
arrives here on the next `derive.sh`. A fix to routing, config or the build
belongs to whichever template it is in.
