module.exports = {
  apps : [
		{
			name: 'collector',
			script: 'dist/src/index.js',
			// Preload src/instrumentation.ts (OpenTelemetry) before the worker's modules.
			node_args: '--import ./dist/src/instrumentation.js',
			watch: false,
			autorestart: false,
		}
	],
};
