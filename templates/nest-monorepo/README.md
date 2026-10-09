# nest-monorepo

The `nest-api` and `node-worker` stacks as one Yarn 4 + Turborepo workspace,
sharing one Prisma package instead of the worker keeping a copy of the API's
schema.

```
stack new nest-monorepo ~/Projects/acme/backend --name acme
stack new nest-monorepo ~/Projects/acme/backend --name acme --without app-worker   # API only, worker addable later
```

## Layout of a generated project

```
apps/api/           nest-api, importing Prisma from @scope/db
apps/worker/        node-worker (the app-worker feature), importing the same client
packages/db/        prisma/schema, prisma/migrations, the client compiled to CommonJS
compose.yml         Postgres + Redis (+ Temporal) for every app
.forgejo/           root CI; the images build from the monorepo root
```

## This template is derived

Nothing in `files/` or `template.json` is edited by hand. Both are rebuilt by:

```
bash templates/nest-monorepo/derive.sh
stack doctor nest-monorepo
```

- **App code** comes from `templates/nest-api` and `templates/node-worker`.
  Change it there, then re-derive.
- **Root files, `packages/db`, both Dockerfiles and the root CI** live in
  `overrides/`, copied over the derived tree last.
- **`template.json`** is `manifest.base.json` (top-level fields, the
  monorepo's own features, wording for merged ones) plus every feature of the
  two source manifests with its paths moved under `apps/`. The worker's
  features are renamed where they would collide with the API's:
  `queue` → `worker-queue`, `browser` → `worker-browser`, `pm2` → `worker-pm2`,
  `telemetry` → `observability`.
- **What the move changes** (Prisma imports, `package.json`, the `db:*` and
  compose scripts, the `CLAUDE.md` and skills that name those paths) is patched
  by `derive.mjs`. Every patch names the exact text it expects and fails when a
  source template rewords it.
