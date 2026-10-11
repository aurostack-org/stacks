---
name: stack-setup
description: Take freshly generated stacks projects from "installed" to "running and verified locally" — env values, local services, the first migration and seed, the worker's schema, the frontend's API types, a smoke check of each service — then write what is left before production as a checklist. Works on one project or a whole product root (API first, then workers, then the frontend). USE THIS after stack-new or stack-from-design, or when someone says "set it up", "get it running", "it won't boot", "fill in the env", "wire the services together", or "what's left before we deploy". It never asks for credentials in chat and never prints a secret.
---

# Setting up generated projects

Generation stops at "installed and committed": every value that is per
project, per environment or secret is left for setup, on purpose. This skill
does that setup with the user. The source of truth for what each template
needs is the docs' setup checklist (`docs/src/content/docs/setup/checklist.mdx`
in this plugin, and each template's Environment page); read it for the
templates in play before starting.

The env helper is `node ${CLAUDE_PLUGIN_ROOT}/skills/stack-setup/env.mjs`
(`$ENV` below). Its header documents `status`, `generate`, `set` and `copy`.

## Secrets: the rules

- **Never read a `.env` file** (no `cat`, `Read`, `grep` of values, `source`
  in an echoing shell). Use `$ENV status <dir>`, which reports key names and
  states only: missing, empty, example (still the `.env.example` value), set.
- **Never ask for a credential in chat**, and never write one the user typed
  into a message. For real credentials (SMTP, S3, OAuth, GrowthBook, API
  keys), name the keys and the file, let the user fill them in their editor
  or in Infisical, then confirm with `$ENV status`.
- **Local-only secrets are generated in place**: `$ENV generate <dir> KEY`.
  Nothing is printed.
- **Values shared between services are copied**, never retyped:
  `$ENV copy api BASIC_AUTH_PASS web API_DOC_PASSWORD`.
- `$ENV set` is for non-secret values only: hosts, ports, names, flags, local
  dummy SMTP credentials.
- `.env` files stay out of git. Confirm they are ignored before finishing.

## 1. Find what to set up

- A **product root** (a `BUILD-PLAN.md`, or several directories with a
  `stack.json`): set up every service, in order: the API, then workers, then
  frontends. Later steps depend on earlier ones running.
- A **single project**: its `stack.json` names the template and features.

Check the tools the templates need: Docker (Compose), Node with Corepack
(`yarn`), Python 3 for `py-worker`, `openssl`. Report anything missing; do not
install system software without asking.

## 2. Infisical first, if it is set up

`yarn secrets` (`-e dev` by default) **overwrites** `.env` with the project's
Infisical environment. So it runs before anything else writes to `.env`:

- A `"projectId"` in the service's `infisical.jsonc` and the `infisical` CLI
  logged in: ask, then run `yarn secrets` in each service that has the script
  (in a monorepo, each workspace has its own `infisical.jsonc`). If a
  `.env` already has local edits, say they will be replaced and ask first.
- Otherwise: local setup uses `.env` alone, and wiring Infisical goes on the
  production checklist (step 7).

## 3. Fill each service's env

Run `$ENV status <dir>` and work through what it reports, using the template's
Environment docs for what each key means.

**nest-api**
- `BETTER_AUTH_SECRET` at its example value: `$ENV generate api BETTER_AUTH_SECRET`.
- SMTP (required to boot): offer a local catcher, as the SMTP docs describe:
  `docker run -d --name mailpit -p 587:1025 -p 8025:8025 axllent/mailpit`, then
  `$ENV set api SMTP_HOST=localhost SMTP_PORT=587 SMTP_SECURE=false SMTP_USER=dev SMTP_PASSWORD=dev`.
  Check port 587 is free first; reuse an existing mailpit container.
- `SUPERUSER_*` and `BASIC_AUTH_*` may keep their example values locally (the
  user needs to sign in with them); they go on the production checklist.
- Feature credentials the config requires (GrowthBook with `feature-flags`;
  S3 keys with `media` if uploads are exercised): ask the user to fill them.
- **The boot is the authority**: config is Zod-validated at startup and names
  every missing or malformed variable. When unsure, start it and read the
  error.

**node-worker / py-worker**
- `DATABASE_URL` (node) or `DB_*` (python), and `REDIS_*`: the same database
  and Redis as the API. Copy them from the API with `$ENV copy` (python's
  `DB_*` are the parts of the API's `DATABASE_URL`; for the template's local
  Compose these are non-secret defaults and can be `set`).
- `py-worker`: `HOME_PATH` = the project's absolute path.
- `OTEL_SERVICE_NAME` distinct per service.

**react-app / react-monorepo**
- `VITE_APP_API_URL` = the API's URL (default `http://localhost:5000`).
- For `yarn gen`: `API_DOC_URL=<api>/openapi-json`, `API_DOC_USER` and
  `API_DOC_PASSWORD` copied from the API's `BASIC_AUTH_USER` /
  `BASIC_AUTH_PASS` (`react-app`: its `.env`; `react-monorepo`:
  `packages/types/.env`).
- `react-monorepo`: each `apps/*/.env` has the sibling `VITE_APP_*_HOST`
  origins; the API's `FRONTEND_HOST` + `MISC_CORS_ORIGINS` must list every
  app's origin, or sign-in bounces.

**The links between services** must agree on both ends: the frontend's API
URL and the API's `FRONTEND_HOST`; the same Redis and queue names for API and
workers; `TEMPORAL_*` on the API and the worker that runs its workflows. The
full-stack guide (`docs/src/content/docs/guides/full-stack.mdx`) lists each
link.

## 4. Bring up and verify the API

```sh
yarn dc:up && yarn dc:wait     # Postgres + Redis from compose.yml
yarn db:migrate                # the first migration, against the current schema
yarn db:seed
```

- The template ships no migrations: the first `db:migrate` creates one from
  whatever models exist. If the product's own models are not written yet,
  migrate the template's (auth and any feature models) now and say the next
  migration comes with the data model.
- Start it in the background (`yarn start`), wait for it, and check:
  `curl -fsS localhost:5000/health` succeeds and `/docs` answers. Read the
  log on failure; fix and retry before moving on.
- With `testing`: `yarn test:dc:reinstall` then `yarn test` proves the test
  stack too (e2e is optional here; say whether it ran).
- Leave the API running while the workers and frontend are checked.

## 5. Workers

**nest-monorepo**: run the API steps above from the monorepo root or
`apps/api`; there is no schema to copy, both apps import `packages/db`. Give
`apps/worker/.env` the API's `DATABASE_URL` and `REDIS_*`, then start
`yarn dev` from the root in the background and check both the API (`/health`)
and the worker's log, and stop it. The API's tests run from `apps/api`.

**node-worker**: bring the API's schema in. Copy the API's
`prisma/schema/*.prisma` except `base.prisma` into `worker/prisma/schema/`,
and remove the placeholder `User` model from the worker's `base.prisma` (the
API's `auth.prisma` defines the real one); or set up a git submodule if the
user prefers. Then `yarn db:generate`, start `yarn dev` in the background,
check the log shows it started and connected to Redis with no errors, and
stop it.

**py-worker**: the venv exists (`.venv`), requirements installed; start
`.venv/bin/python worker.py` in the background, check it reports its workers
started, and stop it.

## 6. Frontend

- `yarn gen` against the running API (`react-monorepo`:
  `yarn workspace @<scope>/types gen`), then leave the generated types for the
  user to commit.
- Start `yarn dev` in the background, check the app answers on its port, and
  ask the user to sign in once in the browser with the seeded superuser, the
  one check that proves cookies, CORS and the API URL agree. With mailpit,
  verification emails are at http://localhost:8025.
- `yarn typecheck && yarn lint` should pass on the untouched project.

Then stop every process this skill started (the API, dev servers), and leave
Docker services running unless the user says otherwise.

## 7. Write what is left

Write `SETUP.md` at the product root (or the project root), per service:

- **Done**: what now runs locally, how it was verified, and the commands to
  start it again.
- **Still to fill locally**, if anything: keys by name, the file, and the doc
  that explains each.
- **Before production**, from the docs' checklist for each template and
  feature present: production values (`APP_ENV`, public URLs, cookie domain,
  `RATE_LIMIT_IP_HEADERS`), example values to change (`SUPERUSER_*`,
  `BASIC_AUTH_*`), real Postgres, Redis, SMTP and S3, Infisical environments
  and the project id in every `infisical.jsonc`, CI repository secrets, OpenObserve orgs and
  tokens, a Temporal namespace, DNS and TLS. Each item links to its doc page
  and is an unticked box: this skill does not do them.

## 8. Hand over

Report per service: running and verified (with how), anything still blocking,
and where `SETUP.md` is. Name the one check the user must do themselves (the
browser sign-in) if they have not yet. If the product has a `TASKS.md`, the
Foundations tasks this completes can be closed.
