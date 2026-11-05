import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
	...nextVitals,
	...nextTs,
	{
		rules: {
			'@typescript-eslint/ban-ts-comment': 'warn',
			'@typescript-eslint/no-empty-object-type': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					args: 'after-used',
					ignoreRestSiblings: false,
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^(_|ignore)'
				}
			]
		}
	},
	{
		// The starter's components predate these React Compiler rules. Warn for
		// now; the UI kit swap rewrites most of them.
		rules: {
			'react-hooks/set-state-in-effect': 'warn',
			'react-hooks/refs': 'warn'
		}
	},
	{
		ignores: [
			'.next/',
			'node_modules/',
			'src/payload-types.ts',
			'src/payload-generated-schema.ts',
			'src/app/(payload)/admin/importMap.js',
			'src/migrations/'
		]
	}
];

export default eslintConfig;
