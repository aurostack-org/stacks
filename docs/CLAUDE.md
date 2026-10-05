# stacks docs

Astro Starlight site for stacks, deployed to GitHub Pages from `main` at
https://stacks.aurostack.co.

- `npm run dev` (http://localhost:4321/), `npm run build` (what CI runs).
- Feature, env and skill tables render from `templates/*/template.json`,
  `.env*.example` and `files/.claude/skills/*/SKILL.md` via
  `scripts/sync-templates.mjs` (writes
  `src/data/generated/`, gitignored). Don't hand-copy those facts into pages.
- Every env variable needs a note in `src/data/env-notes.json` (key: `NAME` or
  `template:NAME`); the build fails otherwise.
- Links between pages are **relative** (`../../services/redis/`), never
  absolute (`/services/redis/`): a private build may serve the same pages under
  another base. `scripts/check-links.mjs` validates every internal link and
  `#anchor` in `dist/` after the build.
- Diagrams: archify specs in `diagrams/<name>.<type>.json`, rendered with
  `scripts/render-diagrams.sh [name]` into `public/diagrams/` (committed).
  Embed with `<Diagram name title height />`.
- `<Internal id="x" />` is an extension point for a private build; it renders
  nothing here. Internal content never goes in this repository.
