/**
 * Every indexable route, with the metadata that describes it.
 *
 * **This is the single source.** `PageSeo` renders per-route tags from it and
 * the build emits `sitemap.xml` from it (see `vite.config.ts`), so the sitemap
 * cannot list a route that does not exist or miss one that does — the classic
 * way a sitemap rots. Add a route here on the same commit that adds it to
 * `app/router.tsx`, and remove it the same way; a sitemap advertising a 404
 * stays invisible until a crawler finds it.
 *
 * Kept free of React imports: `vite.config.ts` imports this directly, and the
 * config is bundled with esbuild.
 */
export type SeoRoute = {
	/** Path as it appears in the router, leading slash, no trailing slash. */
	path: string;
	/** Page segment only — `MetaProvider` appends the brand suffix. */
	title: string;
	description: string;
	/** Relative priority for the sitemap; the homepage leads. */
	priority: string;
	changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
};

export const SEO_ROUTES: SeoRoute[] = [
	{
		path: '/',
		title: 'Home',
		description: 'Replace with the description search results should show.',
		priority: '1.0',
		changefreq: 'weekly'
	}
];

/**
 * The one origin that may be indexed. Staging and preview builds compare
 * unequal and are served `noindex`, so a preview deploy cannot outrank
 * production for its own content.
 */
export const PRODUCTION_ORIGIN = 'https://example.com';

export const seoRouteFor = (path: string) => SEO_ROUTES.find((route) => route.path === path);

/**
 * Absolute URL for a path — canonical, `og:url` and sitemap entries all need one.
 *
 * `origin` is passed in rather than read here so this file stays free of
 * `import.meta.env`: it is imported by `vite.config.ts`, where `import.meta.env`
 * does not exist. App code gets the origin from its env, the build from its own
 * `loadEnv`.
 */
export const absoluteUrl = (path: string, origin: string) => (path === '/' ? `${origin}/` : `${origin}${path}`);

/** Strip a trailing slash so joins don't produce `//about`. */
export const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');

/*
 * Not included here: **prerendering**. `vite build` emits a single SPA shell,
 * so a crawler that does not execute JavaScript sees an empty `#root` for every
 * route. `robots.txt` and `sitemap.xml` are emitted from this table at build
 * time (see `vite.config.ts`), which is the half that matters for discovery —
 * but if these pages need to rank on their content, add a post-build pass that
 * renders each `SEO_ROUTES` entry to `dist/<path>/index.html`. Drive it from
 * this table, not a second list, or the sitemap and the prerendered set drift.
 */
