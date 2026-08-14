import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { VitePWA } from 'vite-plugin-pwa'; // @feature pwa
import { BRAND } from './src/shared/ui/meta/brand';
import { THEME_COLORS } from './src/shared/ui/theme/theme-colors';
// @feature:start marketing
import { PRODUCTION_ORIGIN, SEO_ROUTES, absoluteUrl, normalizeOrigin } from './src/features/seo/routes';
// @feature:end

/**
 * Opens the connection to the API origin while the HTML is still parsing.
 *
 * The app's first act is a Better Auth session request, and the API is a
 * different origin, so that request pays DNS + TCP + TLS before it can even be
 * sent. Measured against a deployed API: ~420 ms of an ~880 ms `get-session` was
 * connection setup. Preconnecting overlaps it with the bundle download instead
 * of paying it afterwards.
 *
 * `crossorigin` is load-bearing, not decoration. Better Auth and RTK Query both
 * send the session cookie (`credentials: 'include'`), and a credentialed request
 * will not reuse an anonymous socket — omit it and the browser opens a second
 * connection, making the preconnect pure waste. It must also stay a *preconnect*
 * and never become a `preload`: the session response is user-specific and must
 * not be speculatively fetched.
 *
 * Injected here rather than in `index.html` because `VITE_APP_API_URL` is only
 * known to the build, and HTML can't read env.
 */
function apiPreconnect(apiUrl: string): Plugin {
	let origin = '';
	try {
		origin = apiUrl ? new URL(apiUrl).origin : '';
	} catch {
		/* malformed VITE_APP_API_URL — skip rather than emit a broken tag */
	}
	return {
		name: 'app:api-preconnect',
		transformIndexHtml: {
			order: 'pre',
			handler: () =>
				origin
					? [
							{
								tag: 'link',
								attrs: { rel: 'preconnect', href: origin, crossorigin: true },
								injectTo: 'head-prepend' as const
							}
						]
					: []
		}
	};
}

/**
 * Substitutes `%THEME_LIGHT%` / `%THEME_DARK%` / `%APP_TITLE%` in `index.html`.
 *
 * The `<head>` needs the theme background twice over — the pre-paint script that
 * sets the `dark` class before first paint, and the `html` background that stops
 * a white flash on a dark load — and HTML cannot import. The static `<title>` is
 * the same story: it must match the suffix `MetaProvider` appends at runtime, so
 * it comes from `BRAND` rather than being typed out a second time.
 *
 * Runs for `vite dev` as well as the build.
 */
function injectHtmlConstants(): Plugin {
	return {
		name: 'app:inject-html-constants',
		transformIndexHtml: (html) =>
			html
				.replaceAll('%THEME_LIGHT%', THEME_COLORS.light)
				.replaceAll('%THEME_DARK%', THEME_COLORS.dark)
				.replaceAll('%APP_TITLE%', BRAND.name)
	};
}

// @feature:start marketing
/**
 * Emits `robots.txt` and `sitemap.xml` at build time from `SEO_ROUTES`.
 *
 * Generated rather than committed to `public/` so the sitemap cannot drift from
 * the routes that actually exist. A sitemap advertising a 404, or missing a real
 * page, is the usual failure here and it stays invisible until a crawler finds
 * it.
 *
 * `apply: 'build'` — `public/` isn't written in dev and the dev server has no
 * use for either file.
 */
function seoFiles(origin: string, indexable: boolean): Plugin {
	return {
		name: 'app:seo-files',
		apply: 'build',
		generateBundle() {
			// Non-production gets the same file inverted: serving production's copy
			// from a preview host is duplicate content, and it must not advertise a
			// sitemap it doesn't want crawled.
			const robots = (
				indexable
					? [
							'# Public pages — crawling is welcome.',
							'# The authenticated app and the auth screens are noindex; see index.html.',
							'User-agent: *',
							'Allow: /',
							...(origin ? ['', `Sitemap: ${origin}/sitemap.xml`] : []),
							''
						]
					: [
							`# Not production (origin: ${origin || 'unset'}). Only ${PRODUCTION_ORIGIN} should be indexed.`,
							'# Paired with the noindex meta tag below — robots.txt alone does not deindex.',
							'User-agent: *',
							'Disallow: /',
							''
						]
			).join('\n');
			this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });

			// Every <loc> must be absolute per the sitemap spec, so without an origin
			// emit nothing rather than something invalid. robots.txt above then also
			// omits its Sitemap line, keeping the two consistent.
			if (!origin) {
				this.warn('VITE_APP_SITE_URL is not set — skipping sitemap.xml, which requires absolute URLs.');
				return;
			}

			const urls = SEO_ROUTES.map(
				(route) =>
					'\t<url>\n' +
					`\t\t<loc>${absoluteUrl(route.path, origin)}</loc>\n` +
					`\t\t<changefreq>${route.changefreq}</changefreq>\n` +
					`\t\t<priority>${route.priority}</priority>\n` +
					'\t</url>'
			).join('\n');

			this.emitFile({
				type: 'asset',
				fileName: 'sitemap.xml',
				source:
					'<?xml version="1.0" encoding="UTF-8"?>\n' +
					'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
					`${urls}\n` +
					'</urlset>\n'
			});
		}
	};
}

/**
 * When the security policy expires, as an RFC 9116 `Expires:` field must. A date
 * in the past makes the whole file invalid to the tools that read it, so this
 * needs bumping — along with a review of the policy itself — before it lapses.
 */
const SECURITY_TXT_EXPIRES = '2027-09-01T00:00:00.000Z';

/**
 * Emits `/.well-known/security.txt` (RFC 9116).
 *
 * Researchers and automated scanners look for this file, not for a footer link.
 * Production-only, unlike `robots.txt`: `Canonical:` must be the URL the file is
 * actually served from, so a preview environment publishing one that claims the
 * production origin would be advertising a false record rather than a harmless
 * duplicate. An unset support address skips the file entirely — a security.txt
 * pointing at an unmonitored mailbox is worse than none.
 *
 * `docker/nginx.conf` needs its `^~ /.well-known/` block for this to be
 * reachable at all; the dotfile deny would otherwise 403 it.
 */
function securityTxt(origin: string, indexable: boolean, securityEmail: string): Plugin {
	return {
		name: 'app:security-txt',
		apply: 'build',
		generateBundle() {
			if (!indexable || !origin || !securityEmail) return;
			this.emitFile({
				type: 'asset',
				fileName: '.well-known/security.txt',
				source: [
					`# ${BRAND.name} — Security & Responsible Disclosure`,
					'',
					`Contact: mailto:${securityEmail}`,
					`Expires: ${SECURITY_TXT_EXPIRES}`,
					'Preferred-Languages: en',
					`Canonical: ${origin}/.well-known/security.txt`,
					''
				].join('\n')
			});
		}
	};
}

/**
 * Injects `noindex, nofollow` into `index.html` on every non-production build.
 *
 * The meta tag is the half that actually deindexes — `robots.txt` only asks a
 * crawler not to fetch, and a URL it already knows can still be listed without
 * ever being fetched. Both halves are emitted together, from the same flag.
 */
function noindexOffProduction(indexable: boolean): Plugin {
	return {
		name: 'app:noindex-off-production',
		apply: 'build',
		transformIndexHtml() {
			if (indexable) return;
			return [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' as const }];
		}
	};
}
// @feature:end

// `loadEnv` rather than `process.env`: VITE_APP_* live in `.env`, not the shell,
// so the build would otherwise never see them.
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, import.meta.dirname, '');
	const hosts = env.VITE_APP_ALLOWED_HOSTS;
	// @feature:start marketing
	const siteOrigin = normalizeOrigin(env.VITE_APP_SITE_URL ?? '');
	// An unset or unrecognised origin counts as non-production — see PRODUCTION_ORIGIN.
	const indexable = siteOrigin === PRODUCTION_ORIGIN;
	// @feature:end

	return {
		plugins: [
			react(),
			tailwindcss(),
			apiPreconnect(env.VITE_APP_API_URL),
			injectHtmlConstants(),
			// @feature:start marketing
			seoFiles(siteOrigin, indexable),
			securityTxt(siteOrigin, indexable, env.VITE_APP_SUPPORT_EMAIL ?? ''),
			noindexOffProduction(indexable),
			// @feature:end
			// @feature:start pwa
			VitePWA({
				// 'prompt', not 'autoUpdate': a new build waits until the user accepts
				// it. Taking over mid-session swaps the asset manifest under a running
				// app, so the next lazy route resolves to a chunk that no longer exists.
				registerType: 'prompt',
				injectRegister: 'auto',
				// No `includeAssets`. It adds files to the precache manifest that the
				// icon globs already matched, which is how icons end up listed twice.
				//
				// `includeManifestIcons: false` for the same reason: install icons are
				// fetched by the OS at install time and play no part in rendering the
				// shell offline, so precaching them just re-downloads them per deploy.
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
					 * Precache = what's needed to boot the shell offline, and nothing
					 * else. Every entry is re-downloaded whenever its hash changes, so
					 * this list is a recurring cost on every deploy, not a one-off.
					 *
					 * `png`/`ico` are deliberately excluded: the only images in the build
					 * are launch/app icons, which the OS and browser fetch themselves and
					 * keep in the HTTP cache. `svg` stays — anything that reaches
					 * `assets/` came from `src` and is therefore shell code.
					 *
					 * Big lazy-loaded vendor chunks (a charting library, an editor) do not
					 * belong here either; the runtime rule below covers them, so they work
					 * offline from second use rather than before first use.
					 */
					globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
					navigateFallback: '/index.html',
					cleanupOutdatedCaches: true,
					runtimeCaching: [
						{
							/*
							 * Anything hashed that isn't precached. Safe as CacheFirst
							 * precisely because the filenames are content-hashed: a changed
							 * file is a new URL, so a stale entry is unreachable rather
							 * than wrong.
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
							 * Remote images — user-uploaded avatars and the like. Matched by
							 * request destination rather than hostname so it doesn't hardcode
							 * a media origin, and bounded so an opaque cross-origin response
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
						 * No rule for the API, on purpose. Decide deliberately before
						 * adding one: a stale response is worse than no response for
						 * anything the user acts on, and offline degrading to "no data" is
						 * usually the correct behaviour.
						 *
						 * Fonts need no rule either: they're self-hosted and same-origin,
						 * so they're precached above, which is strictly better.
						 */
					]
				}
			})
			// @feature:end
		],
		server: {
			host: true,
			port: env.PORT ? Number(env.PORT) : undefined,
			strictPort: true,
			allowedHosts: hosts ? hosts.split(',').map((h) => h.trim()) : []
		},
		resolve: {
			alias: {
				'@': path.resolve(import.meta.dirname, './src')
			}
		}
	};
});
