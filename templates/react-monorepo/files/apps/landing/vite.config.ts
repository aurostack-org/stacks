import { defineAppConfig } from '@inerds/config/vite';
import { BRAND } from '@inerds/ui/brand';
import { THEME_COLORS } from '@inerds/ui/theme-colors';
import { loadEnv, type Plugin } from 'vite';
import { PRODUCTION_ORIGIN, SEO_ROUTES, absoluteUrl, normalizeOrigin } from './src/features/seo/routes';

/**
 * Emits `robots.txt` and `sitemap.xml` at build time from `SEO_ROUTES`.
 *
 * Generated rather than committed to `public/` so the sitemap cannot drift from
 * the routes that actually exist. A sitemap advertising a 404, or missing a real
 * page, is the usual failure here and it stays invisible until a crawler finds
 * it. `/roadmap` is absent from the table precisely because its route is
 * currently commented out in `app/router.tsx`.
 *
 * `apply: 'build'` — `public/` isn't written in dev and the dev server has no
 * use for either file.
 */
function seoFiles(origin: string, indexable: boolean): Plugin {
	return {
		name: 'inerds:seo-files',
		apply: 'build',
		generateBundle() {
			// Non-production keeps the same file, inverted: a dev server serving the
			// same copy as production is duplicate content, and it must not advertise a
			// sitemap it doesn't want crawled.
			const robots = (
				indexable
					? [
							'# Public marketing site — crawling is welcome here.',
							'# The app, auth and admin subdomains are deliberately noindex (MAI-102).',
							'User-agent: *',
							'Allow: /',
							...(origin ? ['', `Sitemap: ${origin}/sitemap.xml`] : []),
							''
						]
					: [
							`# Not production (origin: ${origin || 'unset'}). Only ${PRODUCTION_ORIGIN} should be indexed.`,
							'# Paired with the noindex meta tag in index.html — robots.txt alone does not deindex.',
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
 * Emits `/.well-known/security.txt` (RFC 9116) pointing at the `/security` route.
 *
 * Researchers and automated scanners look for this file, not for a footer link,
 * so without it the policy page is one nobody arrives at. `Contact:` must stay
 * the same address as the policy states in its Sections 1, 8 and 19.
 *
 * Production-only, unlike `robots.txt`: `Canonical:` must be the URL the file is
 * actually served from, so a preview environment publishing one that claims to
 * live on the production origin would be advertising a false record rather than
 * a harmless duplicate. `docker/nginx.conf` needs its `^~ /.well-known/` block
 * for this to be reachable at all — the dotfile deny would otherwise 403 it.
 */
function securityTxt(origin: string, indexable: boolean, securityEmail: string): Plugin {
	return {
		name: 'inerds:security-txt',
		apply: 'build',
		generateBundle() {
			if (!indexable || !origin || !securityEmail) return;

			this.emitFile({
				type: 'asset',
				fileName: '.well-known/security.txt',
				source: [
					'# Investment Nerds — Security & Responsible Disclosure',
					`# Full policy: ${absoluteUrl('/security', origin)}`,
					'',
					`Contact: mailto:${securityEmail}`,
					`Expires: ${SECURITY_TXT_EXPIRES}`,
					`Policy: ${absoluteUrl('/security', origin)}`,
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
 *
 * `index.html` is the shell the prerender pass copies for all seven routes, so
 * one tag here covers the whole site.
 */
function noindexOffProduction(indexable: boolean): Plugin {
	return {
		name: 'inerds:noindex-off-production',
		apply: 'build',
		transformIndexHtml() {
			if (indexable) return;
			return [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }];
		}
	};
}

// `loadEnv` rather than `process.env`: VITE_APP_* live in the app's `.env` files
// (pulled from Infisical), not the shell, so the build would otherwise never see
// the site URL.
const env = loadEnv(process.env.NODE_ENV ?? 'production', import.meta.dirname, '');
const siteOrigin = normalizeOrigin(env.VITE_APP_SITE_URL ?? '');
// Omitted rather than guessed: a security.txt pointing at an unmonitored
// address is worse than none at all, so an unset value skips the file.
const securityEmail = env.VITE_APP_SUPPORT_EMAIL ?? '';

// An unset or unrecognised origin counts as non-production — see PRODUCTION_ORIGIN.
const indexable = siteOrigin === PRODUCTION_ORIGIN;

// `themeColors` substitutes %THEME_LIGHT%/%THEME_DARK% into index.html — the
// pre-paint theme script and the `html` background both need them, and HTML
// can't import. `appTitle` substitutes %APP_TITLE% for the same reason: the
// static <title> must match the suffix MetaProvider appends at runtime.
export default defineAppConfig({
	rootDir: import.meta.dirname,
	themeColors: THEME_COLORS,
	appTitle: BRAND.name,
	plugins: [
		seoFiles(siteOrigin, indexable),
		securityTxt(siteOrigin, indexable, securityEmail),
		noindexOffProduction(indexable)
	]
});
