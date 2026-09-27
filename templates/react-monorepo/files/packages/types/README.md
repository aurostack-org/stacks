# @acme/types

Generated TypeScript types + Zod schemas from the backend OpenAPI document.
Consumed by `@acme/api` and the apps, so a stale copy here shows up as a type
error in an app rather than at runtime.

## Usage

```ts
import type { UserEntity, GetUsersResponse } from '@acme/types';
import { zUserEntity } from '@acme/types/zod';
```

## Regenerating

Requires the backend's docs credentials in `.env` (see `.env.example`).

```bash
yarn workspace @acme/types gen
```

That fetches `openapi.json` from the running backend and runs
`@hey-api/openapi-ts` over it, rewriting `src/types/api/*`. **Commit the
regenerated files** — they are the contract the apps compile against, and CI
compares them to the live schema.

`src/types/api/*` ships as an empty placeholder so a freshly scaffolded
monorepo typechecks before the backend exists. The first `gen` replaces it.
