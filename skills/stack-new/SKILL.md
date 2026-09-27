---
name: stack-new
description: Scaffold a new project from the house templates — a NestJS API, a single-app React frontend, a Turborepo React monorepo, a Node background worker, or a Python worker — choosing which optional features to include. USE THIS whenever someone is starting a new codebase and says "new backend", "new API", "spin up a project", "start a new app", "scaffold", "bootstrap a service", "I need a worker", or names one of the templates. Also use when asked what templates or features are available. It runs the `stack` CLI; it does not hand-write boilerplate.
---

# Scaffolding a new project

House templates live in `${CLAUDE_PLUGIN_ROOT}/templates`, driven by a
zero-dependency Node CLI at `${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs` (the same CLI
people run in a terminal as `stack`, from the `@aurostack/stacks` npm package).

**Never hand-write this boilerplate.** If a template covers the stack, generate
from it — hand-copying drifts from the template immediately and loses the
feature wiring the manifests encode.

## How the templates work

Each template is **subtractive**: `templates/<name>/files` is a complete,
runnable app with *every* optional feature switched on, annotated with
`@feature` markers. Generating a project **deletes** what you did not ask for.
That is why the template itself stays installable and testable — an additive
pile of fragments never does.

## The flow

### 1. Establish what they are building

Run `node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs list` and, for the likely template,
`... info <template>` to see its features. Then ask only what you cannot infer:

- **Which template.** Usually obvious from the request. A service with HTTP
  endpoints is `nest-api`; background jobs with no HTTP surface are
  `node-worker` (or `py-worker` when the work belongs in Python — data
  processing, ML, scientific libraries).

  A browser UI is `react-app` or `react-monorepo`. **Default to `react-app`.**
  They are the same stack; the difference is deployment, so ask about that
  rather than about code:

  | | `react-app` | `react-monorepo` |
  |---|---|---|
  | Deployments | one | one per app |
  | Auth screens | routes (`/login`) | their own origin |
  | Session | plain cookie | cross-subdomain cookie |
  | Release cadence | together | independent per app |

  `react-monorepo` earns its extra moving parts when surfaces genuinely ship on
  different cadences, or one needs to scale or be locked down on its own. If
  they cannot say that is true, it isn't.
- **Project name and directory.** The name defaults to the directory's
  basename; `--scope` (npm scope, no `@`) defaults to the name.
- **Which optional features.** Present the opt-in list and the defaults you
  intend to drop. Do not enumerate every feature — name the handful that
  actually depend on what they said, and state the rest as "defaults".

Use `AskUserQuestion` when the answer changes the generated output. Do not ask
about things with an obvious default.

### 2. Generate

```
node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs new <template> <dir> \
  --name <name> --scope <scope> [--port N] \
  [--with a,b] [--without c,d]
```

Useful flags: `--all` (every optional feature), `--dry-run` (report only),
`--no-hooks` (skip install / prisma generate / git init), `--force` (write into
a non-empty directory).

Requirements resolve transitively, and disabling something another selected
feature requires is a hard error rather than a silently broken project.

### 3. Report and hand over

Print the template's `nextSteps`, then say plainly:

- which features are in and which were left out;
- that `.env` was seeded from `.env.example` and **still holds placeholders** —
  `DATABASE_URL`, `BETTER_AUTH_SECRET` and any credentials must be set before
  the app will boot, because config is Zod-validated at startup and a missing
  variable fails the process immediately;
- for `nest-api`: `yarn dc:up` starts Postgres and Redis, then `yarn db:migrate`
  creates the initial migration. The template ships **no** migrations — the
  first one is generated against the user's own schema;
- for `react-app` / `react-monorepo`: `VITE_APP_API_URL` must point at the
  backend. Vite inlines it at build time, so a built image is pinned to one
  environment — that is a build arg, not runtime config.

The generated project records what produced it in `stack.json`.

## Adding to a project after the fact

There is no `stack add`. To bring in a feature later, generate a throwaway
project with `--dry-run` off into a temp directory and copy the parts across, or
just install the dependency and wire it by hand — the manifest's feature entry
(`${CLAUDE_PLUGIN_ROOT}/templates/<t>/template.json`) lists exactly which files and
package keys that feature owns, which is the checklist to follow.

## When a template does not fit

Say so rather than forcing it. Generating a `nest-api` for something that is not
a NestJS service leaves the user deleting more than they keep. Scaffold by hand,
and if the shape recurs, suggest adding a template — see the `stack-sync` skill.
