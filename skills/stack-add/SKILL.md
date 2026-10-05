---
name: stack-add
description: Add an optional template feature to a project the templates already generated — realtime, notifications, temporal, feature flags, graphql, marketing, admin, pwa, charts and the rest — by merging exactly what that feature changes into the project with `stack add`, keeping the project's own edits. USE THIS when someone wants to add or enable a feature in an existing stacks project: "add realtime to the API", "we need notifications now", "turn on temporal", "add an admin console", "can we get charts", "I want the PWA bits", or asks what features a project could still take. Not for a project stacks did not generate (no stack.json), and not for removing a feature.
---

# Adding a feature to a generated project

`stack add` does the mechanics: it regenerates the project's template twice
(as it is, and with the new features), formats both with the project's
Prettier, and merges the difference in with `git merge-file`. The result is
the same as if the project had been generated with the feature from the start,
plus whatever the project has changed since. This skill does the judgement
around it: which features, in which services, and what still has to be done
by hand afterwards.

The CLI is `node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs` (the `stack` command in a
terminal). Never hand-copy a feature's files from the template: the merge is
what keeps composition roots, `package.json` and `.env` consistent.

## 1. Find the project and what it has

Read the project's `stack.json`: the template, its features, the stacks version
that generated it. No `stack.json` means stacks did not generate it; say so and
stop. Then:

```
node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs info <template>
```

lists every feature with its requirements. Check the request against it.
Features are per template, and names can mean different things in different
templates (`realtime` on `nest-api` is the Socket.IO gateway; on `react-app`
it is the client).

## 2. Decide what to add, and where

- **Requirements come along automatically** (`media` brings `queue`, which
  brings `cache`). Name them before running so nothing
  arrives unannounced.
- **Some features come in pairs across services.** Adding one half alone
  leaves a feature that compiles and does nothing:

  | Feature | Add to |
  |---|---|
  | `realtime` | the API (`nest-api`) and the frontend (`react-app` / `react-monorepo`) |
  | `temporal` | the API and the worker that runs the workflows (`node-worker` / `py-worker`) |
  | `notifications` | the API; to push them live, `realtime` on the API and the frontend too (without it they are stored and fetched, not pushed) |

  When the project sits in a product root with sibling services (a
  `BUILD-PLAN.md`, or `api/`, `web/`, `worker/` side by side), check the
  siblings' `stack.json` and offer the other half.
- **Read the feature's manifest entry** (`templates/<t>/template.json`): its
  `description` says what it gives and what it costs, and its `files` say where
  it lands. If the project already built something equivalent by hand (its own
  socket layer, its own flags client), say so before adding a second one.

Use `AskUserQuestion` only for choices that change what gets added: the pair,
or a feature whose description says it changes structure (`marketing` moves a
`react-app`'s authenticated routes under `/app`).

## 3. Dry run, then add

The project must be a git repository with a clean tree, so the feature lands as
one reviewable diff. If it is dirty, ask the user to commit or stash; do not
reach for `--force` on their behalf.

```
node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs add <feature...> --dir <project> --dry-run
node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs add <feature...> --dir <project>
```

The report lists new files, merged files, removed files (an `@feature:else`
branch the feature replaces), conflicts, files to review, and the `.env` keys
it added. Then the template's hooks run: install, format, Prisma generate.

## 4. Resolve what the merge could not

- **Conflicts** are marked in the file, `<<<<<<< yours` against
  `>>>>>>> with <feature>`. Most are a list the project and the feature both
  extended (module imports, a providers array, routes): keep both sides. Where
  the two genuinely disagree, read the feature's version in the template and
  the project's intent, and ask the user if it is not clear. Never leave a
  marker behind.
- **"New from the template, but you already have a different one"**: the
  project created a file at a path the feature owns. Compare them and merge by
  hand, or tell the user which to keep.
- **"You deleted it"** and **"you changed it, so it stays"**: the project
  diverged on purpose; report them, do not recreate or delete anything.
- **`package.json` keys kept** because the project pinned a different version:
  report them; leave the user's version unless it breaks the feature.

Then run the project's own checks: `yarn typecheck` (or `yarn build`),
`yarn lint`, and the tests the feature brought (`yarn test` for `nest-api`).
They must pass before handing over.

## 5. What `stack add` does not do

Say plainly what is left, per feature:

- **`.env` values.** New keys arrive with placeholders. Config is validated at
  startup, so a missing value fails the process: name each key and what it
  needs (a Temporal address, a GrowthBook key).
- **Migrations.** A feature that adds Prisma models (`notifications`) needs
  `yarn db:migrate` in the API; the worker then needs the updated schema copied
  in and `yarn db:generate`.
- **Generated client types.** A feature that adds API endpoints changes the
  OpenAPI document: run `yarn gen` in the frontend against the running API.
- **Wiring it into the product.** The feature arrives as infrastructure (a
  gateway, a client, a route branch). Using it in the product's own modules and
  screens is build work, and is worth a task if the product has a `TASKS.md`.

## 6. Hand over

Report: the features added (and the requirements that came with them), the
counts from the report, how each conflict was resolved, the checks that
passed, and the remaining steps from section 5. The whole change is uncommitted
in the project; `git diff` shows it, and `git checkout . && git clean -fd`
undoes it. Offer to commit it as one commit (`feat: add <feature> from the
<template> template`).

## When it does not apply

- **Template improvements since the project was generated** are not a
  feature: that is `stack-upgrade`.
- **Removing a feature** is not supported: it would delete code the project
  may have built on. Say so; removal is a hand job guided by the feature's
  `files` in the manifest.
- **A project generated before `stack.json` recorded `port`** regenerates with
  the template's default port. If it used `--port`, add `"port": <n>` to its
  `stack.json` first (a one-line commit), or expect conflicts on port lines.
- **A feature the template no longer has** cannot be regenerated; `stack add`
  ignores it in the project's list.
