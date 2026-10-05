---
name: add-admin-page
description: Add a page to this monorepo's admin console app (apps/admin) — the route under its RoleRoute, its nav entry, noindex meta, and the API-side check it relies on. Use when asked to "add an admin page", "build the X queue/table for admins", "a console screen for moderators", or for any back-office screen.
---

# Add an admin page

`apps/admin` is its own app and origin. Its router wraps everything in
`RoleRoute allow={['admin', 'superuser']}`; `src/routes/home.tsx` is the
example page.

1. **Build the page** in `apps/admin/src/routes/<name>.tsx` the way
   `add-screen` describes, with `<PageMeta title="Things" robots="noindex" />`.

2. **Register it** as a child in `apps/admin/src/app/router.tsx` (lazy import,
   relative path) and add it to `apps/admin/src/app/nav.tsx`.

3. **Roles.** `RoleRoute` hides the console from the wrong users; it does not
   protect anything. Every endpoint the page calls must check the role or
   permission on the API. If only some admin roles may open this page, wrap
   its route in a `RoleRoute` with that narrower `allow` list, and make the
   API agree.

4. **Origins.** The admin host (`VITE_APP_ADMIN_HOST`) must be one the API
   trusts (`FRONTEND_HOST` or `MISC_CORS_ORIGINS`), or its requests fail CORS
   and sign-in bounces.

5. **Check**: `yarn workspace admin dev`, sign in as each role the console
   admits (and one it does not), then confirm the API refuses the request for
   the role that should not have it.
