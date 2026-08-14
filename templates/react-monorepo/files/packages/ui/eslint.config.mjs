import config from '@inerds/config/eslint';

export default [
	...config,
	{
		// @inerds/ui is a component library consumed as source, not a Vite HMR
		// boundary — exporting cva variants (buttonVariants) alongside components
		// is intentional, so the Fast Refresh rule doesn't apply here.
		rules: {
			'react-refresh/only-export-components': 'off'
		}
	}
];
