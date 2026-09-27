// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { sidebar as publicSidebar } from './sidebar.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// The public site is served at the root of stacks.aurostack.co (GitHub Pages
// with a custom domain). A private build (stackbook) overrides these through
// the environment, and points @internal at its own notes; the public build
// resolves it to an empty directory, so no internal content can reach it.
const site = process.env.DOCS_SITE ?? 'https://stacks.aurostack.co';
const base = process.env.DOCS_BASE ?? '/';
const internalDir = process.env.DOCS_INTERNAL_DIR ?? path.join(here, 'src/internal-empty');
// A private build can also replace the sidebar (a module exporting `sidebar`,
// usually the public one plus its own section), hide the edit links (they point
// at the public repository), and mark every page noindex.
const sidebar = process.env.DOCS_SIDEBAR
	? (await import(path.resolve(process.env.DOCS_SIDEBAR))).sidebar
	: publicSidebar;
const editLinks = process.env.DOCS_EDIT_LINKS !== 'false';
const noindex = process.env.DOCS_NOINDEX === 'true';

export default defineConfig({
	site,
	base,
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: process.env.DOCS_TITLE ?? 'stacks',
			description:
				'Scaffold production-ready projects from Aurostack templates: a NestJS API, React apps, and Node or Python workers.',
			logo: { src: './src/assets/logo.svg', replacesTitle: false },
			favicon: '/favicon.svg',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/aurostack-org/stacks' }
			],
			...(editLinks && {
				editLink: { baseUrl: 'https://github.com/aurostack-org/stacks/edit/main/docs/' }
			}),
			head: noindex
				? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } }]
				: [],
			lastUpdated: true,
			customCss: ['./src/styles/custom.css'],
			sidebar,
			// Relative links are checked on the built output by scripts/check-links.mjs,
			// which this plugin cannot do; it still validates absolute ones.
			plugins: [starlightLinksValidator({ errorOnLocalLinks: false, errorOnRelativeLinks: false })]
		})
	],
	vite: {
		resolve: { alias: { '@internal': internalDir } }
	}
});
