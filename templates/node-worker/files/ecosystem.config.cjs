module.exports = {
  apps : [
		{
			name: 'collector',
			script: 'dist/src/index.js',
			watch: false,
			autorestart: false,
		}
	],
};
