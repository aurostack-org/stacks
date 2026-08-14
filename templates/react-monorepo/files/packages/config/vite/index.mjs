import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

/**
 * Opens the connection to the API origin while the HTML is still parsing.
 *
 * Every authenticated app's first act is a Better Auth session request, and the
 * API is a different origin, so that request pays DNS + TCP + TLS before it can
 * even be sent. Measured against the deployed API: ~420 ms of an ~880 ms
 * `get-session` was connection setup. Preconnecting overlaps it with the bundle
 * download instead of paying it afterwards.
 *
 * `crossorigin` is load-bearing, not decoration. Better Auth and RTK Query both
 * send the session cookie (`credentials: 'include'`), and a credentialed request
 * will not reuse an anonymous socket — omit it and the browser opens a second
 * connection, making the preconnect pure waste. It must also stay a *preconnect*
 * and not become a `preload`: the session response is user-specific and must not
 * be speculatively fetched.
 *
 * Injected here rather than in each `index.html` because `VITE_APP_API_URL` is
 * only known to the build, and HTML can't read env.
 */
function apiPreconnect(apiUrl) {
	let origin = '';
	try {
		origin = apiUrl ? new URL(apiUrl).origin : '';
	} catch {
		/* malformed VITE_APP_API_URL — skip rather than emit a broken tag */
	}
	return {
		name: 'inerds:api-preconnect',
		transformIndexHtml: {
			order: 'pre',
			handler: () =>
				origin
					? [{ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: true }, injectTo: 'head-prepend' }]
					: []
		}
	};
}

/**
 * Substitutes `%THEME_LIGHT%` / `%THEME_DARK%` in `index.html`.
 *
 * Every app's `<head>` needs the theme background twice over — the pre-paint
 * script that sets the `dark` class before first paint, and the `html`
 * background that stops a white flash on a dark load — and HTML cannot import.
 * Doing it here keeps `THEME_COLORS` the single source of truth instead of four
 * hardcoded copies drifting apart; that drift is exactly how the client's PWA
 * manifest once ended up `#ffffff` in both themes.
 *
 * The colours are passed in rather than imported: `@inerds/config` is the lowest
 * layer and must not depend on `@inerds/ui`, which already depends on it.
 *
 * Runs for `vite dev` as well as the build.
 */
function injectThemeColors(colors) {
	return {
		name: 'inerds:inject-theme-colors',
		transformIndexHtml: (html) => html.replaceAll('%THEME_LIGHT%', colors.light).replaceAll('%THEME_DARK%', colors.dark)
	};
}

/**
 * Substitutes `%APP_TITLE%` in `index.html`.
 *
 * The static `<title>` is the fallback a visitor sees before React mounts, and
 * on any route that renders no `PageMeta`. It has to match the suffix that
 * `MetaProvider` appends at runtime, and the brand string is passed in from
 * `@inerds/ui/brand` so there is one source rather than a literal per app — four
 * copies of "Inerds" drifting from the real product name is precisely what
 * MAI-101 was filed about.
 *
 * Passed in rather than imported for the same reason as the theme colours:
 * `@inerds/config` is the lowest layer and must not depend on `@inerds/ui`.
 */
function injectAppTitle(appTitle) {
	return {
		name: 'inerds:inject-app-title',
		transformIndexHtml: (html) => html.replaceAll('%APP_TITLE%', appTitle)
	};
}

/**
 * Shared Vite config factory for Inerds apps.
 *
 * Usage in an app's `vite.config.ts`:
 *   import { defineAppConfig } from '@inerds/config/vite';
 *   export default defineAppConfig({ rootDir: import.meta.dirname });
 *
 * Reads `PORT` and comma-separated `VITE_APP_ALLOWED_HOSTS` from the app's env,
 * wires the `@` -> `src` alias, and registers the React + Tailwind v4 plugins.
 * Extra app-specific plugins (e.g. the PWA plugin on the client) are appended
 * after the base ones via `plugins`.
 *
 * @param {{ rootDir: string, themeColors?: { light: string, dark: string }, appTitle?: string, plugins?: import('vite').PluginOption[], overrides?: import('vite').UserConfig }} options
 * @returns {import('vite').UserConfigExport}
 */
export function defineAppConfig({ rootDir, themeColors, appTitle, plugins = [], overrides = {} }) {
	return defineConfig(({ mode }) => {
		const env = loadEnv(mode, rootDir, '');
		const hosts = env.VITE_APP_ALLOWED_HOSTS;
		const allowedHosts = hosts ? hosts.split(',').map((h) => h.trim()) : [];
		return {
			plugins: [
				react(),
				tailwindcss(),
				apiPreconnect(env.VITE_APP_API_URL),
				...(themeColors ? [injectThemeColors(themeColors)] : []),
				...(appTitle ? [injectAppTitle(appTitle)] : []),
				...plugins
			],
			server: {
				host: true,
				port: env.PORT ? Number(env.PORT) : undefined,
				strictPort: true,
				allowedHosts
			},
			resolve: {
				alias: {
					'@': path.resolve(rootDir, './src')
				}
			},
			...overrides
		};
	});
}
