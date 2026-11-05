import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		include: ['tests/int/**/*.int.spec.ts'],
		// One database for every file: run them one at a time, or two files booting
		// Payload against a fresh database race to create the same schema.
		fileParallelism: false,
		// Booting Payload and pushing the schema takes a while on a fresh database.
		hookTimeout: 60_000
	}
});
