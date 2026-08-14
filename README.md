# stacks

House project templates, and the generator that stamps them out.

```
stack list                              # what's available
stack info nest-api                     # its features and defaults
stack new nest-api ~/Projects/acme/api --with realtime --without media
```

The CLI is plain Node ESM with **no dependencies and no build step**:

```sh
alias stack='node ~/.claude/stacks/cli/stack.mjs'
```

## The templates

| Template | What you get |
|---|---|
| `nest-api` | NestJS 10 + Prisma (Postgres) + Redis + BullMQ + better-auth + Vitest, Docker Compose for local Postgres/Redis, Scalar API reference at `/docs` |
| `react-monorepo` | Yarn workspaces + Turborepo; Vite/React 19 apps over shared packages — one RTK Query `baseApi`, better-auth session handling, a shadcn-style UI kit with light/dark theming, layouts, generated OpenAPI types |
| `react-app` | The same stack as one Vite app: shared code under `src/shared`, auth screens as routes, optional marketing site and admin console. One deployment instead of four |
| `node-worker` | Standalone TypeScript worker — BullMQ consumers, Prisma against the API's database, pino, PM2 + Docker |
| `py-worker` | Python BullMQ worker over the same queues, SQLAlchemy models on the same Postgres |

### Monolith or monorepo

`react-app` and `react-monorepo` are the same stack, and the choice between them
is a deployment decision, not a code one:

- **`react-app`** — one origin, one build, one image. The auth screens are routes
  (`/login`), so the session guard navigates instead of bouncing across hosts, and
  there is no cross-subdomain cookie to configure. Start here.
- **`react-monorepo`** — separate apps on separate origins, deployed and released
  independently, sharing one session cookie across subdomains. Worth its extra
  moving parts when a marketing site and an app genuinely ship on different
  cadences, or when one surface needs to scale or be locked down on its own.

The shared code is literally the same files: `templates/react-app/derive.sh`
re-flattens `packages/*` into `src/shared/*` and rewrites the import specifiers,
so a fix in one lands in the other. See that template's README.

## How it works

Templates are **subtractive**. `templates/<name>/files` is a complete, runnable
app with *every* optional feature switched on, annotated with `@feature`
markers. Generating a project **deletes** what you did not ask for.

The point of that choice: the template itself stays installable, buildable and
testable. A template assembled from additive fragments is only ever exercised at
generation time, so it rots silently. This one you can `yarn install` and run.

Generation does four things:

1. drops files owned by a disabled feature (`features.<x>.files`);
2. strips `@feature` regions from the files that survive;
3. prunes `package.json` / `requirements.txt` entries the feature owned — JSON
   cannot carry comments, so those are declared in the manifest instead;
4. applies the rename map, so `@inerds/ui` becomes `@yourscope/ui`.

Then the post-generation hooks install dependencies and run the project's own
`yarn format`. That last step is not cosmetic: deleting a feature leaves code
that is *valid but no longer formatted* — an array that now fits on one line, a
blank line where a block used to be — and the generated CI runs `format:check`.
Formatting with the project's own Prettier is the only fix that generalises;
hand-tuning the template for how each combination happens to strip does not.

Template files hold real working identifiers rather than `__PLACEHOLDER__`
sludge — that is what keeps them compilable in place. Renaming is by declared
search/replace pairs in `template.json`.

### Marker syntax

Comment-syntax agnostic, so `//`, `#` and `<!-- -->` all work:

```ts
import { Gateway } from 'realtime';        // @feature realtime

// @feature:start realtime, notifications  ← OR across the list
// @feature:else                           ← kept only when none matched
// @feature:end

// @feature:start !realtime                ← negation
```

**One sharp edge.** An inline marker deletes exactly *one line*. Parking one on
the closing line of a multi-line import or object literal leaves the construct
half-open — and because the template has every feature on, it still compiles.
Nothing catches it until someone generates without that feature. Wrap
multi-line constructs in `@feature:start`/`@feature:end`. `stack doctor` checks
for this.

## stack doctor

Run it after touching a template. Across the two extremes of the feature space
*and* each optional feature flipped on its own, it verifies that:

- every `@feature` name is declared in the manifest (a typo'd
  `@feature realtimee` silently deletes code otherwise);
- every feature's `files` globs match something;
- TypeScript brackets stay balanced after stripping;
- JSON still parses;
- **nothing imports a file the selection deleted** — the one that catches a
  barrel re-exporting a module that is no longer there.

## Keeping templates current

```
stack extract nest-api            # re-copy from the live repo
stack extract nest-api --prune    # also drop files the source no longer has
```

Extraction is deliberately mechanical — it copies what the manifest's globs say.
Files it would overwrite are reported as **conflicts** and left alone, because
those are usually the ones you hand-edited to add markers or strip domain code.
Files outside the include globs (a hand-written `.env.example`, a template-only
seeder) can never be pruned, by construction.

Two things never enter a template: **secrets** — `.env*` is excluded for exactly
this reason, and every template ships a hand-written `.env.example` instead —
and **migrations**, which belong to one database's history and would fight the
first migration a generated project creates.

## Two things learned the hard way

Both templates that use Yarn ship a **`.yarnrc.yml` with `nodeLinker:
node-modules`**. Under Yarn's default PnP linker, `ts-node` crashes on startup
and `prisma generate` fails with `EROFS` trying to place its engine binaries.
Everything else works under PnP; those two do not.

Templates with a Prisma schema ship at least **one model**. A model-less schema
generates no client at all, so every `@db/*` / `#prisma/*` import in a freshly
scaffolded project fails to resolve, and the error points at the imports rather
than at the schema.

## Layout

```
~/.claude/stacks/
├── .claude-plugin/     plugin + marketplace manifests
├── skills/
│   ├── stack-new/      scaffolding a new project
│   └── stack-sync/     folding changes back into the templates
├── cli/
│   ├── stack.mjs       entry point
│   └── src/            manifest, generate, extract, strip, tokens, hooks
└── templates/<name>/
    ├── template.json   features, rename map, source globs, post-gen hooks
    └── files/          the runnable superset app
```

`~/.claude` is not a git repository. `git init ~/.claude/stacks` if you want
these versioned independently — nothing here depends on the path.
