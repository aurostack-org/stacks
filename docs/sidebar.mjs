// The public sidebar. Exported on its own so a private build (stackbook) can
// reuse it and add its own sections.
const template = (name, label) => ({
	label,
	collapsed: true,
	items: [
		{ label: 'Overview', slug: `templates/${name}` },
		{ label: 'Architecture', slug: `templates/${name}/architecture` },
		{ label: 'Features', slug: `templates/${name}/features` },
		{ label: 'Environment', slug: `templates/${name}/environment` },
		{ label: 'Development', slug: `templates/${name}/development` },
		{ label: 'Deployment', slug: `templates/${name}/deployment` }
	]
});

export const sidebar = [
	{
		label: 'Start here',
		items: [
			{ label: 'Introduction', slug: 'start/introduction' },
			{ label: 'Installation', slug: 'start/installation' },
			{ label: 'Your first project', slug: 'start/first-project' },
			{ label: 'How stacks works', slug: 'start/how-it-works' }
		]
	},
	{
		label: 'Templates',
		items: [
			{ label: 'Choosing templates', slug: 'templates' },
			template('nest-api', 'nest-api'),
			template('react-app', 'react-app'),
			template('react-monorepo', 'react-monorepo'),
			template('node-worker', 'node-worker'),
			template('py-worker', 'py-worker')
		]
	},
	{
		label: 'After you generate',
		items: [
			{ label: 'Setup checklist', slug: 'setup/checklist' },
			{ label: 'Secrets with Infisical', slug: 'setup/secrets' },
			{ label: 'All environment variables', slug: 'setup/environment' }
		]
	},
	{
		label: 'Connecting services',
		items: [
			{ label: 'Overview: local vs production', slug: 'services' },
			{ label: 'PostgreSQL', slug: 'services/postgres' },
			{ label: 'Redis', slug: 'services/redis' },
			{ label: 'Object storage (S3)', slug: 'services/s3' },
			{ label: 'Email (SMTP)', slug: 'services/smtp' },
			{ label: 'Google sign-in', slug: 'services/google-oauth' },
			{ label: 'Feature flags (GrowthBook)', slug: 'services/growthbook' },
			{ label: 'OpenObserve', slug: 'services/openobserve' },
			{ label: 'Temporal', slug: 'services/temporal' },
			{ label: 'Auth, cookies and CORS', slug: 'services/auth-domains' }
		]
	},
	{
		label: 'Guides',
		items: [
			{ label: 'Building with Claude Code', slug: 'guides/claude-code' },
			{ label: 'A full-stack project', slug: 'guides/full-stack' },
			{ label: 'Background work: BullMQ or Temporal', slug: 'guides/background-work' },
			{ label: 'Observability end to end', slug: 'guides/observability' },
			{ label: 'Deploying', slug: 'guides/deploying' }
		]
	},
	{
		label: 'Self-hosting',
		items: [
			{ label: 'Temporal', slug: 'self-hosting/temporal' },
			{ label: 'OpenObserve', slug: 'self-hosting/openobserve' },
			{ label: 'Infisical', slug: 'self-hosting/infisical' }
		]
	},
	{
		label: 'Maintaining stacks',
		items: [
			{ label: 'Refreshing templates', slug: 'maintaining/extract' },
			{ label: 'Checks: doctor and CI', slug: 'maintaining/checks' },
			{ label: 'Releasing', slug: 'maintaining/releasing' },
			{ label: 'Writing docs and diagrams', slug: 'maintaining/docs' }
		]
	},
	{
		label: 'Reference',
		items: [
			{ label: 'CLI', slug: 'reference/cli' },
			{ label: 'template.json', slug: 'reference/manifest' },
			{ label: 'Feature markers', slug: 'reference/markers' }
		]
	}
];
