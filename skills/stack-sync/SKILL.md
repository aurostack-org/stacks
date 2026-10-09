---
name: stack-sync
description: Fold improvements from a live codebase back into the house templates, or add a new feature/template to them. USE THIS when someone says "update the template", "sync the boilerplate", "the starter is out of date", "add X to the template", "make this a feature", "pull my changes into the stack", or after a piece of generic infrastructure has been built in a real project and should be reusable. Also use when `stack doctor` fails. It is the maintenance side of the templates that `stack-new` generates from.
---

# Maintaining the house templates

Templates live in `templates/<name>/` as a `template.json` manifest plus a
`files/` tree, in a **git checkout** of
[aurostack-org/stacks](https://github.com/aurostack-org/stacks). Maintenance
writes into the templates, so it always runs against that checkout, never an
installed copy — this plugin and the npm package are both copies that the next
update replaces, and `stack extract` refuses to run from one.

A maintainer's checkout is set up with `bash install.sh`, which links the bare
`stack` command to it. Use `stack` in the commands below. If `stack extract`
says it needs a git checkout, the `stack` on PATH is an installed copy: clone
the repo (`git clone https://github.com/aurostack-org/stacks.git`), run
`bash stacks/install.sh`, and retry.

`stack extract` is deliberately mechanical: it copies whatever the template's
source config says. Deciding what is generic infrastructure and what is domain
code is judgement work, and that judgement lives in the source config — **your
job here, not the CLI's.**

The source config is maintainer-local, never in the public manifests: a
gitignored `stacks.local.json` at the repo root (or the file `STACKS_LOCAL`
names), one entry per template:

```json
{
  "sources": {
    "nest-api": {
      "path": "~/Projects/my-app/backend",
      "include": ["src/**", "test/**", "package.json"],
      "exclude": ["src/billing/**"],
      "skipDirs": ["logs"],
      "replacements": [
        { "from": "My App", "to": "Acme Corp" },
        { "from": "my-app", "to": "acme" }
      ]
    }
  }
}
```

`replacements` map the source app's own identifiers onto the template's working
ones (`Acme Corp` / `AcmeCorp` / `acme-corp` / `acme`, longest first) as files
come in, so a refresh never reintroduces the source's product name.

## Refreshing a template from its source repo

```
stack extract <template> [--source <dir>] [--prune]
```

- **copied** — new or identical files, written.
- **conflicts** — the template's copy differs from the source. These are *not*
  automatically overwritten, because they are usually files you hand-edited to
  add `@feature` markers or strip domain code. Review each one: take the
  source's improvement, re-apply the annotations, write the merged result. Only
  pass `--overwrite` when you genuinely want the source version verbatim, and
  expect to re-annotate afterwards.
- **template-only** — files the globs claim but the source no longer has.
  `--prune` deletes these. Files *outside* the include globs (a hand-written
  `.env.example`, a template-only seeder) can never be pruned, by construction.

After any extract, run `stack doctor <template>` before considering it done.

## Derived templates

`react-app` has no source config. It is derived from `react-monorepo` — same
stack, one deployment — by `templates/react-app/derive.sh`, which re-flattens
`packages/*` into `src/shared/*`, rewrites `@scope/x` to `@/shared/x`, and then
copies `overrides/` on top.

So the direction of a change matters:

- shared code (UI kit, data layer, auth, layouts) and the page components — edit
  **`react-monorepo`**, then `bash templates/react-app/derive.sh`;
- routing, config, build, Docker — edit whichever template it belongs to; the
  script does not touch those;
- a file that genuinely has to differ in a monolith — add it to
  `templates/react-app/overrides/`, which is the complete list of intentional
  divergences and should stay short.

Run `stack doctor react-app` after every derive.

`nest-monorepo` is derived the same way, from **two** templates:
`templates/nest-monorepo/derive.mjs` (run it with `bash
templates/nest-monorepo/derive.sh`) copies `nest-api` into `apps/api` and
`node-worker` into `apps/worker`, moves the Prisma schema into `packages/db`,
rewrites the imports, scripts and guidance that the move changes, copies
`overrides/` on top, and **writes `template.json`** from `manifest.base.json`
plus both source manifests. So an app-level change goes in `nest-api` or
`node-worker`; the root files, `packages/db`, the Dockerfiles and the root CI
go in `templates/nest-monorepo/overrides/`; a new or renamed feature goes in
`manifest.base.json` or the derive's rename map. Every text patch in the
derive names the exact text it expects, so rewording one of the source
templates' `CLAUDE.md` or skills can fail the derive: update the patch then.
Run `stack doctor nest-monorepo` after every derive.

## Adding a new optional feature

1. **Put the working code in `files/`**, with every feature switched on. The
   template must stay a runnable app.
2. **Annotate the composition roots** it touches. Three marker forms, comment
   syntax agnostic:

   ```ts
   import { Gateway } from 'realtime';        // @feature realtime

   // @feature:start realtime, notifications  ← OR across the list
   ...
   // @feature:else                           ← kept only when none matched
   ...
   // @feature:end

   // @feature:start !realtime                ← negation
   ```

   **The sharp edge:** an inline marker deletes exactly *one line*. Parking one
   on the closing line of a multi-line import or object literal leaves the
   construct half-open. The template still compiles (every feature is on), so
   nothing catches it until someone generates without that feature. Wrap
   multi-line constructs in `@feature:start`/`@feature:end` instead. `doctor`
   checks for this, which is why you must run it.

   **Avoid `@feature:else` in TypeScript.** Both branches are present in the
   template at once, so at most one of them can compile. Prefer indirection
   whose members are individually annotated — a type alias, a constant array —
   over an either/or block. `@feature:else` is fine in `.env`, YAML and Markdown.

   **Stripping leaves valid but unformatted code**, and the generated CI runs
   `format:check`. An array that loses an element now fits on one line; a list
   that empties reads `[\n]`; a trailing comma is left on what is now the last
   entry. Do not hand-tune the template for how each combination happens to
   strip — that is unwinnable. The post-generation `yarn format` hook fixes it
   for real, so every template with a Prettier config has one. Only reach for
   structure when a construct would otherwise *empty*: keep one permanent
   element (`['', 'app']` — an absolute path's first segment is empty anyway),
   which is both honest and stable in every combination.

3. **Declare it in `template.json`**:

   ```json
   "realtime": {
     "title": "Socket.IO realtime layer",
     "description": "What it gives you, and what it costs.",
     "default": false,
     "requires": ["cache", "auth"],
     "files": ["src/realtime/**"],
     "packageJson": { "dependencies": ["socket.io"] },
     "requirements": ["websockets"]
   }
   ```

   - `files` — deleted wholesale when the feature is off. Include its tests.
   - `packageJson` — JSON cannot carry comments, so dependency and script keys
     are pruned by name instead. Takes a `file` for a monorepo package.
   - `requirements` — the same, for `requirements.txt` (match the distribution
     name only; pins and extras are handled).
   - `core: true` — always on, cannot be removed.

   Two manifest fields at the top level are easy to forget and silently weaken
   `doctor`: **`aliasRoots`** (`{"@/": "src/"}`) is what lets the dangling-import
   check follow path-aliased imports at all — without it every `@/...` import is
   simply skipped, and doctor passes on a template it never examined — and
   **`generatedPaths`**, which stops build output (a Prisma client, generated
   OpenAPI types) being reported as missing.

4. **Run `stack doctor <template>`** and fix what it reports.

## How template changes reach projects

A change to a template reaches projects generated earlier only through
`stack upgrade` (the `stack-upgrade` skill), which merges what changed between
the project's recorded release and now. So a template change should be one a
project can take as a merge: keep files where they are unless moving them is
the point, and say in the PR what a project has to do beyond the code (a new
env key, a migration, a runtime bump), because that is what the release notes
upgrades read will show.

## Keeping the in-project guidance true

Every template ships guidance for the project it generates: a `CLAUDE.md` at
the root of `files/` and task skills in `files/.claude/skills/<name>/SKILL.md`
(`add-resource`, `add-screen`, `add-worker`…). They describe the template's
code, so **a change to the code is a change to the guidance**: when you rename
a helper, move a file, change a convention or add a feature, update the
`CLAUDE.md` section and the skills that mention it in the same commit. A skill
that points at a function that no longer exists is worse than none.

- Feature-specific guidance is gated like code. A whole skill that belongs to
  one feature goes in that feature's `files` in `template.json`
  (`".claude/skills/add-job/**"` under `queue`), so it is dropped without the
  feature and arrives with `stack add`. Sections inside `CLAUDE.md` or a
  shared skill use `<!-- @feature:start x -->` / `<!-- @feature:end -->`
  blocks, or an inline `<!-- @feature x -->` at the very end of a line.
- **A marker owns its whole line.** Text after `-->` on the same line is
  deleted with the line (or kept for the wrong selection), so a marker never
  sits mid-sentence: split the sentence, or move the conditional part to its
  own line. `doctor` rejects text after an HTML-comment marker.
- Never write the marker syntax itself in prose ("wrap it in `@feature`
  markers"): the stripper reads it as a marker. Describe it ("its markers")
  instead.
- `react-app`'s `CLAUDE.md` and skills are its own files, not derived:
  `derive.sh` never touches them. A change to the shared code you make in
  `react-monorepo` may need the same guidance change in both templates.
- Check the guidance strips cleanly: generate the `--all` extreme and a
  minimal selection with `--no-hooks`, and read both `CLAUDE.md` files.

## What `doctor` actually checks

Across the two extremes of the feature space *and* each optional feature
flipped on its own (dropping a feature also drops everything that requires it):

- every `@feature` name is declared in the manifest — a typo'd
  `@feature realtimee` silently deletes code otherwise;
- every feature's `files` globs match something;
- TypeScript brackets stay balanced after stripping (the multi-line trap above);
- JSON still parses (tsconfig-style comments and trailing commas are tolerated);
- **nothing imports a file the selection deleted** — this is the one that
  catches a barrel re-exporting a module that is no longer there;
- no text follows an HTML-comment marker (`<!-- @feature x -->`) on its line.

## Judging generic vs domain

Before pulling something in, ask whether a project in an unrelated business
would want it unchanged. Infrastructure (a Redis cache service, a throttler
storage, an upload pipeline) travels. Anything naming a domain concept does not,
even when the code is generic — a `CurrencyService` or a `forum:feed` room
constant is a rename away from a template that reads like someone else's app.
Rename such things to their generic shape (`channel:<id>`), or exclude them.

Two things must never enter a template: **secrets** (extract excludes `.env*`
for exactly this reason — write a `.env.example` by hand instead) and
**migrations**, which belong to one database's history and would fight the first
migration a generated project creates.

## Adding a whole new template

Create `templates/<name>/template.json`, add a `stacks.local.json` entry whose
globs point at the real repo, run `extract`, then work through the composition roots as above. Copy the
shape of an existing manifest — `nest-api` is the most complete. Register
nothing else; `list`, `info`, `new` and `doctor` discover templates from the
directory.
