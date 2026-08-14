import { defineAppConfig } from '@inerds/config/vite';
import { BRAND } from '@inerds/ui/brand';
import { THEME_COLORS } from '@inerds/ui/theme-colors';
import { VitePWA } from 'vite-plugin-pwa'; // @feature pwa

// `themeColors` substitutes %THEME_LIGHT%/%THEME_DARK% into index.html — here the
// pre-paint theme script and the boot splash both need them. The manifest below
// reads the same object, so there is one source of truth; a hardcoded copy is how
// the manifest once ended up #ffffff in both themes.
export default defineAppConfig({
	rootDir: import.meta.dirname,
	themeColors: THEME_COLORS,
	appTitle: BRAND.name,
	plugins: [
		// @feature:start pwa
		VitePWA({
			// 'prompt', not 'autoUpdate': a new build waits until the user accepts it
			// (see components/pwa-update-prompt.tsx for why taking over mid-session
			// breaks code-split routes).
			registerType: 'prompt',
			injectRegister: 'auto',
			// No `includeAssets`. It adds files to the precache manifest that the icon
			// globs already matched, which is how every icon ended up listed twice.
			//
			// `includeManifestIcons: false` for the same reason the icon globs went:
			// the install icons (32 KB of android-chrome + maskable) are fetched by the
			// OS at install time and play no part in rendering the shell offline, so
			// precaching them just re-downloads them on every deploy.
			includeManifestIcons: false,
			devOptions: {
				enabled: true,
				type: 'module',
				suppressWarnings: true
			},
			manifest: {
				id: '/',
				name: BRAND.name,
				// short_name is what shows under the home-screen icon.
				short_name: BRAND.name,
				description: 'Investment Nerds.',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				theme_color: THEME_COLORS.light,
				background_color: THEME_COLORS.light,
				icons: [
					{ src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{ src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
					{ src: '/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
					{ src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				/*
				 * Precache = what's needed to boot the shell offline, and nothing else.
				 * Every entry here is re-downloaded whenever its hash changes, so this
				 * list is a recurring cost on every deploy, not a one-off install cost.
				 *
				 * Deliberately excluded:
				 * - `png`/`ico`. The only images in the build are launch/app icons, which
				 *   the OS and browser fetch themselves at install time and keep in the
				 *   HTTP cache. None are needed to render the shell offline.
				 * - The ApexCharts vendor chunk. At 763 KB it was 38% of the whole
				 *   precache, for a `lazy()` import that only two routes reach. It's
				 *   covered by the runtime cache below, so it still works offline —
				 *   just from second use rather than before first use.
				 * `svg` stays: nothing matches it today, but an SVG that reaches
				 * `assets/` came from `src` and is therefore shell code.
				 */
				globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
				globIgnores: ['**/splash/**', 'assets/react-apexcharts.esm-*.js'],
				navigateFallback: '/index.html',
				cleanupOutdatedCaches: true,
				runtimeCaching: [
					{
						/*
						 * Anything hashed that isn't precached — the chart vendor chunk today,
						 * plus whatever else gets excluded later. Safe as CacheFirst precisely
						 * because the filenames are content-hashed: a changed file is a new
						 * URL, so a stale entry is unreachable rather than wrong.
						 */
						urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/assets/'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'inerds-assets',
							expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						/*
						 * Remote images — user-uploaded avatars and the like, off the media host.
						 * Matched
						 * by request destination rather than hostname so it doesn't hardcode
						 * the media origin, and bounded so an opaque cross-origin response
						 * (which counts fully against quota) can't grow without limit.
						 */
						urlPattern: ({ request, sameOrigin }) => !sameOrigin && request.destination === 'image',
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'inerds-remote-images',
							expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
							cacheableResponse: { statuses: [0, 200] }
						}
					}
					/*
					 * No rule for `/v1`, on purpose. Decide deliberately before adding
					 * one: a stale API response is worse than no response for anything
					 * the user acts on, and offline degrading to "no data" is usually the
					 * correct behaviour.
					 *
					 * Fonts need no rule either: they're self-hosted and same-origin, so
					 * they're precached above, which is strictly better.
					 */
				]
			}
		})
		// @feature:end
	]
});
