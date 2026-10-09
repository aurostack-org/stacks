# acme-worker

A standalone TypeScript background worker, generated from the stacks
`node-worker` template (`stack.json` records which features it has). It runs
no HTTP server: it consumes the jobs an API produces, against the API's own
database.

It is the `@acme/worker` workspace of a `nest-monorepo` (see
`../../CLAUDE.md`). Its Prisma client is the shared `@acme/db` package
(`packages/db`), the same build the API uses.

## Commands

```sh
yarn dev            # run with the telemetry preload (tsx)
yarn dev:watch      # same, restarting on change
yarn typecheck && yarn lint && yarn format:check
yarn build          # tsc → dist/
yarn db:generate    # rebuild the shared @acme/db client (the API's db:migrate does this too)
```

There is no test script. CI runs `turbo run lint typecheck test build` from the
monorepo root, and the image is built from there too
(`docker build -f apps/worker/Dockerfile .`), so the root `yarn.lock` and
`.yarnrc.yml` must be committed.

## Layout

- `src/index.ts`: starts every worker and shuts them down on SIGTERM/SIGINT.
- `src/config.ts`: the typed config object. `src/logger.ts`: pino.
<!-- @feature:start worker-queue -->
- `src/workers/`: one directory per queue consumer, names in `constants.ts`,
  re-exported from `index.ts`.
- `src/utils/worker.ts`: `createWorker`, the only way to build a consumer.
<!-- @feature:end -->
- `src/db.ts`: `DB.instance`, the Prisma client (`DB.instance.$` adds
  `exists`, `paginate`).
<!-- @feature:start temporal -->
- `src/temporal/`: the Temporal worker, `workflows/` and `activities/`.
<!-- @feature:end -->
<!-- @feature:start worker-browser -->
- `src/utils/browser.ts`: `launchBrowser()` for headless Chromium.
<!-- @feature:end -->
- Imports use the `#app/*`, `#utils/*`, `#lib/*` aliases, with `.js`
  extensions (`#app/logger.js`). Prisma comes from `@acme/db/client` (no
  extension: it is a package export).

## Rules

- **The API owns the database.** The schema and migrations live in
  `packages/db` and change only through the API's `yarn db:migrate`; never
  migrate from here. Every model the API has is already in `@acme/db/client`.
  The `db.ts` extensions are typed against `User`, so typecheck after a schema
  change. The worker runs the compiled client, so restart `yarn dev` after the
  client is rebuilt.
<!-- @feature:start worker-queue -->
- **Queue names and Redis must match the producer's.** A worker on the wrong
  queue or Redis waits forever with no error. Names live in
  `src/workers/constants.ts`; keep them identical to the API's
  `QueueModule.register('<name>')`.
- **Throw on failure.** A job handler that throws is retried with the
  producer's `attempts` / `backoff`; one that swallows an error is marked done.
  Retry policy is set by the producer, not here.
<!-- @feature:end -->
- **Log structured.** `logger.info({ jobId: job.id, ...fields }, 'message')`,
  errors as `{ err }`.
- **Config has no schema.** A new variable goes in the `Config` interface and
  the `config` literal in `src/config.ts`, with a default where one is safe,
  and in `.env.example` with a comment. Telemetry variables are read from
  `process.env` in `src/telemetry/config.ts` instead, because they are needed
  before config loads.
<!-- @feature:start temporal -->
- **Workflows are deterministic, activities idempotent.** No I/O, clock or
  randomness in a workflow; every side effect is an activity that can safely
  run twice. `TEMPORAL_TASK_QUEUE` must be the queue the API starts workflows
  on.
<!-- @feature:end -->

<!-- @feature:start worker-queue, temporal -->
## Skills

- `add-worker`: a new queue consumer for a job the API produces. <!-- @feature worker-queue -->
- `add-workflow`: a new Temporal workflow and its activities. <!-- @feature temporal -->
<!-- @feature:end -->
