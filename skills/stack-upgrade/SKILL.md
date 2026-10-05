---
name: stack-upgrade
description: Bring a project the templates generated up to the current templates — fixes, improvements and the in-project CLAUDE.md and task skills added since — by merging exactly what the templates changed between the project's recorded release and now with `stack upgrade`, keeping the project's own edits. USE THIS when someone says "upgrade the project", "update from the template", "pull in the template fixes", "we're behind the starter", "get the new skills into this project", or after a stacks release. Works on one project or every service in a product root. Not for adding features (that is stack-add) or for maintaining the templates themselves (stack-sync).
---

# Upgrading a generated project

`stack upgrade` does the mechanics. It rebuilds the template twice with the
project's name, scope, port and features: once with the release the project
records in `stack.json` (that release's own CLI and templates, fetched from
the stacks git history or from npm), once with the current templates. Both
are formatted with the project's Prettier, and the difference, everything the
templates changed since, is merged into the project with `git merge-file`.
The project's own edits survive; only hunks that genuinely overlap conflict.

The CLI is `node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs` (`stack` in a terminal).
Never upgrade by copying template files over the project: that throws away
every edit the project made.

## 1. Where the project stands

- Read each project's `stack.json`: `template`, `stackVersion` (the release
  it matches as a whole), `stackCommit` if it was generated between releases,
  and `features`. A product root has one per service; upgrade each.
- `stack --version` is what it would upgrade to.
- **What changed between the two**: the release notes on GitHub
  (`gh release view vX.Y.Z --repo aurostack-org/stacks`, or the releases
  page) for every release in between. They name the PRs; the dry run below is
  the authority on what actually touches this project.

## 2. Dry run

The project needs a clean git tree, so the upgrade is one reviewable diff. If
it is dirty, ask the user to commit or stash; do not pass `--force` for them.

```
node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs upgrade --dir <project> --dry-run
```

It reports where the old release came from, features that changed status
(no longer in the template; now always on), and every file it would write,
merge or remove. Present that to the user grouped by what it is, not as a
flat list:

- **guidance**: `CLAUDE.md`, `.claude/skills/**`;
- **app code**: `src/**` and the like, by module;
- **config and tooling**: `package.json`, tsconfig, lint, Prettier, Vite;
- **infrastructure**: Dockerfile, Compose, CI workflows;
- **env**: `.env.example` changes, new keys, and defaults the template
  changed that the project's `.env` still holds.

Say what each group brings, from the release notes and the files themselves.
Read a changed file's template version where the change is not obvious.

## 3. Choose, then apply

Everything applies by default. The user can keep any part out with
`--exclude <glob>` (repeatable, comma lists), for example a CI workflow they
replaced, or a module they rewrote:

```
node ${CLAUDE_PLUGIN_ROOT}/cli/stack.mjs upgrade --dir <project> --exclude '.forgejo/**'
```

An excluded path is left exactly as it is, and `stack.json` records the
exclusion (`upgradeExcluded`): the project then does not fully match the new
release, and the next upgrade will not offer those changes again. Say so when
the user excludes something.

Then the template's hooks run again (install, format, Prisma generate).

## 4. Resolve and check

- **Conflicts** are marked `<<<<<<< yours` against `>>>>>>> stacks <version>`.
  Take the template's fix and keep the project's intent; where they genuinely
  disagree, explain both and ask. Never leave a marker behind.
- **"You already have a different one"**: a file the template now ships at a
  path the project already used. Compare and merge by hand, or ask.
- **"You deleted it" / "you changed it, so it stays"**: the project diverged
  on purpose; report, do not recreate or delete.
- **`.env` defaults that changed**: the report names keys whose `.env` value
  is still the old default. Upgrade never edits `.env` values; tell the user
  which to update (use `stack-setup`'s env helper, never print values).
- **New `.env` keys** arrive with placeholders; name what each needs.
- **Beyond code**: a migration (Prisma schema files changed: `yarn
  db:migrate`), a Node or Python version bump (`.nvmrc`, Dockerfile base
  image), new CI secrets, a dependency major bump. List each as an action.

Run the project's checks: `yarn typecheck` (or `yarn build`), `yarn lint`,
`yarn format:check`, and the tests the template ships (`yarn test` for
`nest-api`; `python -m compileall` for `py-worker`). They must pass, or the
failure must be explained, before handing over.

## 5. Hand over

Report per project: from which release to which, what arrived (by group),
what was excluded, how each conflict was resolved, the checks that passed,
and the actions left (env values, migration, versions). The change is
uncommitted; offer to commit it as one commit per project
(`chore: upgrade to stacks <version>`).

## When it does not apply

- **No `stack.json`, or no `stackVersion`**: not a generated project, or too
  old to tell. Say so; there is nothing to merge against.
- **The recorded release cannot be fetched** (offline, or a version that was
  never published): `stack upgrade` says so. It needs the release's exact
  templates, so do not substitute a nearby version.
- **Features**: upgrade keeps the project's features. Adding one is
  `stack-add`; a feature the template has since removed is reported and left
  as it is in the project.
