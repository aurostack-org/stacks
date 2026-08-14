# @inerds/config

Shared tooling for the Inerds frontend monorepo. Not a runtime package — it exports config assets other packages/apps extend.

## Exports

| Import                               | What                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `@inerds/config/eslint`              | Flat ESLint config (React 19 + TS). Default-export an array.                                     |
| `@inerds/config/tsconfig/base.json`  | Base TS compiler options (strict, bundler, es2023).                                              |
| `@inerds/config/tsconfig/react.json` | Extends base + DOM libs + `react-jsx`. For apps/UI packages.                                     |
| `@inerds/config/tsconfig/node.json`  | Extends base + node types. For `vite.config.ts` / scripts.                                       |
| `@inerds/config/vite`                | `defineAppConfig({ rootDir })` Vite factory (React + Tailwind v4, `@`→`src`, env-driven server). |
| `@inerds/config/tailwind.css`        | Shared Tailwind v4 `@theme` design tokens.                                                       |

## Consumption

**ESLint** (`eslint.config.mjs`):

```js
import config from '@inerds/config/eslint';
export default config;
```

**tsconfig** (`tsconfig.json`):

```json
{
	"extends": "@inerds/config/tsconfig/react.json",
	"compilerOptions": { "paths": { "@/*": ["./src/*"] } },
	"include": ["src"]
}
```

**Vite** (`vite.config.ts`):

```ts
import { defineAppConfig } from '@inerds/config/vite';
export default defineAppConfig({ rootDir: import.meta.dirname });
```

**Tailwind** (`src/index.css`):

```css
@import 'tailwindcss';
@import '@inerds/config/tailwind.css';
```
