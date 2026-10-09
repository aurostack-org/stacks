# acme

A NestJS API generated from the stacks `nest-api` template (`stack.json`
records which features it has): Prisma over Postgres, better-auth, Zod
validation and serialisation, an OpenAPI reference at `/docs`.

It is the `@acme/api` workspace of a `nest-monorepo` (see `../../CLAUDE.md`).
The Prisma schema, migrations and client live in `packages/db` (`@acme/db`),
shared with every other app; this app owns the database, so every `db:*`
command runs from here.

## Commands

```sh
yarn dc:up && yarn dc:wait   # local Postgres + Redis (root compose.yml)
yarn db:migrate              # create/apply a migration, then rebuild @acme/db
yarn db:generate             # rebuild the @acme/db client without migrating
yarn db:seed                 # seeders/index.ts
yarn start                   # watch mode; http://localhost:5000/docs
yarn build && yarn lint && yarn format
```

<!-- @feature:start testing -->
Tests run against their own Postgres and Redis (root `compose.test.yml`, ports
5499 / 6399, `.env.test`):

```sh
yarn test:dc:reinstall       # once: test stack up, schema pushed, seeded
yarn test                    # unit: src/**/__tests__/*.spec.ts
yarn test:e2e                # e2e: test/**/*.spec.ts, serial, real app
```
<!-- @feature:end -->

## Layout

- `src/app.module.ts`: root wiring (better-auth, global guards, every feature
  module). `src/app.setup.ts`: global pipes, serializer, filters, CORS,
  OpenAPI. `src/main.ts`: boot.
- `src/common/`: the global infrastructure module: `services/` (Prisma,
  config, logger, cache…), `decorators/` (`Op`, `Returns`, `IdParam`…), `dto/`
  and `entity/` building blocks, `schemas/fields.ts`, `utils/`.
- `src/lib/access.ts`: permission statements and roles. `src/lib/auth.ts`: the
  tooling copy of the auth config (seeder, CLI).
- `src/<resource>/`: one module per resource with `controllers/ services/
  dto/ entity/ decorators/ __tests__/`, each with an `index.ts` barrel.
<!-- @feature:start users -->
  `src/users/` is the canonical example.
<!-- @feature:end -->
- `../../packages/db/prisma/schema/*.prisma`: one schema split by area;
  `enum.prisma` holds every enum. Migrations sit beside it in
  `packages/db/prisma/migrations/`. `seeders/`: seed data (stays here).
<!-- @feature:start mail -->
- `emails/`: React Email templates (`__mocks__/` are their test doubles).
<!-- @feature:end -->
- Imports: bare paths from `src/` (`common/services`, `users/users.module`),
  `@acme/db/client` and `@acme/db/enums` for Prisma, relative barrels
  (`'../services'`) inside a module.

## Rules

- **Every route requires a session** (global `AuthGuard`). Opt out with
  `@AllowAnonymous()`. Authorise with a typed permission decorator, and check
  ownership in the service (`where: { id, userId }`), never as a permission.
- **Roles live in `src/lib/access.ts` only**: statements, roles and the
  `roles` map. Test roles with `hasRole`, never `role === 'x'` (roles are a
  comma-separated string).
- **Zod, not class-validator.** Inputs: `@Body({ schema })`,
  `@Query({ schema })`. Outputs: `@Returns(Entity)`; the serializer drops any
  field the entity does not declare and fails on a mismatch, so the entity is
  the response contract.
- **404, not 403**, for a record the viewer may not see, and never return an
  unfiltered list.
- **Never read `process.env` in app code**: inject `CustomConfigService`.
  New variables go through `add-config`.
- **Migrations are generated, not hand-written**: `yarn db:migrate` against
  the schema files in `packages/db`. Never edit a migration that has been
  applied elsewhere. A schema change reaches every app that imports
  `@acme/db`: run `yarn typecheck` from the monorepo root.
- **The API runs the compiled client** (`packages/db/dist`). After
  `db:migrate` / `db:generate`, restart `yarn start`; Nest's watch does not
  see the rebuild.
- **Users are created through `auth.api`**, in the seeder too, never as raw
  rows.
- Keep `src/instrumentation.ts` the first import in `main.ts`, and never
  re-enable Nest's global body parser (better-auth needs the raw body).
<!-- @feature:start testing -->
- A global pipe, filter or interceptor added to `app.setup.ts` also goes into
  `test/factory/app.ts`, or e2e tests run a different app. Every e2e spec ends
  with `await app.close()`.
<!-- @feature:end -->
- After changing endpoints, the frontend regenerates its types (`yarn gen`
  there) from `/openapi-json`.

<!-- @feature:start queue, cache, mail, media, rate-limit, scheduler, http-client, realtime, notifications, feature-flags, temporal, graphql, observability -->
## Features in this project

<!-- @feature:start queue -->
- **Queues**: `QueueModule.register('<name>')` in a module's imports,
  `@InjectQueue('<name>')` to produce, a `WorkerHost` processor to consume.
  Bull Board at `/dashboard`. See `add-job`.
<!-- @feature:end -->
<!-- @feature:start cache -->
- **Cache**: `CacheService` from `common/services` (Redis).
<!-- @feature:end -->
<!-- @feature:start mail -->
- **Mail**: `MailService` enqueues; `common/processors/mail` renders and
  sends. See `add-email`.
<!-- @feature:end -->
<!-- @feature:start media -->
- **Media**: `MediaService.uploadFile(file, Enum.UploadFolder.X)` returns a
  URL; deletes go through the queue. A new folder goes in
  `Enum.UploadFolder` (`src/common/utils/enum.ts`), and in
  `PrivateUploadFolders` unless it may be public.
<!-- @feature:end -->
<!-- @feature:start rate-limit -->
- **Rate limits**: `@Throttle({ default: { limit, ttl } })` (ttl in ms) or
  `@SkipThrottle()` per route; auth endpoint rules in `src/lib/rate-limit.ts`.
<!-- @feature:end -->
<!-- @feature:start scheduler -->
- **Scheduler**: `@Cron(...)` or `@Interval('name', ms)` on any provider.
<!-- @feature:end -->
<!-- @feature:start http-client -->
- **Outbound HTTP**: inject `HttpService` from `@nestjs/axios` (5s timeout).
<!-- @feature:end -->
<!-- @feature:start realtime -->
- **Realtime**: inject `RealtimeService` and emit (`notifyUser`,
  `emitToRoom`, `emitToChannel`, `emitToFeed`, `broadcast`). See
  `add-realtime-event`.
<!-- @feature:end -->
<!-- @feature:start notifications -->
- **Notifications**: `NotificationsService.dispatch(userId, type, data)`
  stores (and pushes, with realtime) a notification and never throws. See
  `add-notification`.
<!-- @feature:end -->
<!-- @feature:start feature-flags -->
- **Feature flags**: declare keys in `AppFeatures`
  (`common/services/feature-flag.service.ts`); gate a route with
  `@RequireFeature('key')` or call `flags.isOn(key, attrs)`. Tests treat
  every flag as on unless `AppFactory.init({ flags })` says otherwise.
<!-- @feature:end -->
<!-- @feature:start temporal -->
- **Temporal**: `TemporalService.client.workflow.start(name, { taskQueue:
  temporal.taskQueue, workflowId, args })` starts a workflow a worker runs.
  BullMQ for fire-and-forget, Temporal for flows that wait or must not
  half-happen. The task queue must be one a worker polls.
<!-- @feature:end -->
<!-- @feature:start graphql -->
- **GraphQL**: code-first; add `@Resolver()` classes to a module's providers
  (`src/app.resolver.ts` is the example). Resolvers need `@AllowAnonymous()`
  to be public, like routes.
<!-- @feature:end -->
<!-- @feature:start observability -->
- **Observability**: traces and logs go out over OTLP once `OPENOBSERVE_*`
  or `OTEL_EXPORTER_OTLP_ENDPOINT` is set; `/health` checks the database.
<!-- @feature:end -->
<!-- @feature:end -->

## Skills

- `add-resource`: a module with endpoints, permissions and tests.
- `add-model`: a Prisma model and its migration.
- `add-config`: a new environment variable, validated.
- `add-job`: a queue producer and processor. <!-- @feature queue -->
- `add-email`: a transactional email. <!-- @feature mail -->
- `add-realtime-event`: a server-to-client event. <!-- @feature realtime -->
- `add-notification`: a new notification type. <!-- @feature notifications -->
