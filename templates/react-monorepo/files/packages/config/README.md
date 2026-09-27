# @acme/config

Shared tooling for the Acme frontend monorepo. Not a runtime package — it exports config assets other packages/apps extend.

## Exports

| Import                               | What                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `@acme/config/eslint`              | Flat ESLint config (React 19 + TS). Default-export an array.                                     |
| `@acme/config/tsconfig/base.json`  | Base TS compiler options (strict, bundler, es2023).                                              |
| `@acme/config/tsconfig/react.json` | Extends base + DOM libs + `react-jsx`. For apps/UI packages.                                     |
| `@acme/config/tsconfig/node.json`  | Extends base + node types. For `vite.config.ts` / scripts.                                       |
| `@acme/config/vite`                | `defineAppConfig({ rootDir })` Vite factory (React + Tailwind v4, `@`→`src`, env-driven server). |
| `@acme/config/tailwind.css`        | Shared Tailwind v4 `@theme` design tokens.                                                       |

## Consumption

**ESLint** (`eslint.config.mjs`):

```js
import config from '@acme/config/eslint';
export default config;
```

**tsconfig** (`tsconfig.json`):

```json
{
	"extends": "@acme/config/tsconfig/react.json",
	"compilerOptions": { "paths": { "@/*": ["./src/*"] } },
	"include": ["src"]
}
```

**Vite** (`vite.config.ts`):

```ts
import { defineAppConfig } from '@acme/config/vite';
export default defineAppConfig({ rootDir: import.meta.dirname });
```

**Tailwind** (`src/index.css`):

```css
@import 'tailwindcss';
@import '@acme/config/tailwind.css';
```
