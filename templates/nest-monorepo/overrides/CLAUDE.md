# acme backend

The backend as one Turborepo + Yarn 4 workspace (`nodeLinker: node-modules`),
generated from the stacks `nest-monorepo` template (`stack.json` records which
features it has). The apps share one database through one Prisma package, so a
schema change and the code that uses it land in the same commit.

| Workspace | Path | What it is |
|---|---|---|
| `@acme/api` | `apps/api` | NestJS API (CommonJS). Owns the database. See `apps/api/CLAUDE.md`. |
<!-- @feature:start app-worker -->
| `@acme/worker` | `apps/worker` | Background worker (ESM). See `apps/worker/CLAUDE.md`. |
<!-- @feature:end -->
| `@acme/db` | `packages/db` | Prisma schema, migrations and the generated client, compiled to `dist/`. |

## Commands (from this folder)

```sh
yarn install                    # one lockfile for every workspace
<!-- @feature:start docker -->
yarn dc:up && yarn dc:wait      # Postgres + Redis from compose.yml
<!-- @feature:end -->
yarn db:migrate                 # the API's migrate: prisma migrate dev in @acme/db, then rebuild it
yarn db:seed
yarn dev                        # builds @acme/db, then runs every app
yarn build | lint | typecheck | test   # turbo run …, across every workspace
```

Run one workspace's script with `yarn workspace @acme/api <script>` or from
its folder.
<!-- @feature:start testing -->
The test stack (`compose.test.yml`) and the e2e suite are driven from
`apps/api`.
<!-- @feature:end -->

## Rules

- **Prisma lives only in `packages/db`.** Import it as `@acme/db/client` and
  `@acme/db/enums`; never generate a client inside an app. The client is
  generated as CommonJS and compiled, so the CommonJS API and an ESM app load
  the same build.
- **The API owns migrations.** Every `db:*` command runs from the API, which
  loads its own `.env*` and runs Prisma in `@acme/db`. No other app migrates.
- **The apps run the compiled client** (`packages/db/dist`). Turbo builds it
  before `build`, `typecheck`, `test` and `dev`; after a schema change outside
  turbo, run `yarn db:generate` and restart `yarn dev`.
- **The API keeps its dependencies in `apps/api/node_modules`**
  (`installConfig.hoistingLimits: "workspaces"`), because its test library
  (Suites) resolves its Vitest adapter from beside itself. Root-level binaries
  such as `turbo` are therefore not on the PATH inside `apps/api`; call them
  from the root.
- **A dependency goes in the workspace that imports it**, never the root (the
  root only holds `turbo`).

<!-- @feature:start docker -->
## Docker

Images are built from this folder, because each one needs `packages/db` as
well as its app:

```sh
docker build -f apps/api/Dockerfile -t acme-api .
docker build -f apps/api/Dockerfile --target migrate -t acme-api-migrate .
<!-- @feature:start app-worker -->
docker build -f apps/worker/Dockerfile -t acme-worker .
<!-- @feature:end -->
```

Each Dockerfile runs `turbo prune <app> --docker`, installs from the pruned
lockfile, builds with turbo and keeps only production dependencies.
`node_modules/@acme/db` is a symlink, so a runtime stage must copy
`packages/db` (its `package.json` and `dist/`) at the same relative path. Run
`acme-api-migrate` once before starting a new API image, and deploy every app
on the same tag. The only `.dockerignore` is the one here.
<!-- @feature:end -->

<!-- @feature:start ci -->
## CI (`.forgejo/workflows/`)

- `ci.yml`: every branch except `main`/`development`. Runs
  `turbo run lint typecheck test build`.
<!-- @feature:start testing -->
- `test-e2e.yml`: PRs into `development`. Runs the API's e2e suite against
  service containers.
<!-- @feature:end -->
- `build-and-push.yml`: `main` and manual runs. Pushes every image under one
  shared tag.
<!-- @feature:end -->
