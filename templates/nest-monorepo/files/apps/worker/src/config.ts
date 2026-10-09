import 'dotenv/config';

interface App {
	env: string;
	logLevel: string;
}

interface Database {
	url: string;
}

interface Redis {
	host: string;
	port: number;
	user?: string | undefined;
	password?: string | undefined;
}

// @feature:start temporal
interface Temporal {
	address: string;
	namespace: string;
	taskQueue: string;
	/** PEM; all empty means plaintext (the local dev server). */
	tls: { ca: string; cert: string; key: string };
}
// @feature:end

// @feature:start worker-browser
interface Puppeteer {
	executablePath: string;
}
// @feature:end

interface Config {
	app: App;
	database: Database;
	redis: Redis;
	temporal: Temporal; // @feature temporal
	puppeteer: Puppeteer; // @feature worker-browser
}

const config: Config = {
	app: {
		env: process.env.APP_ENV ?? 'development',
		logLevel: process.env.LOG_LEVEL ?? 'debug'
	},
	database: {
		url: process.env.DATABASE_URL ?? ''
	},
	redis: {
		host: process.env.REDIS_HOST ?? 'localhost',
		port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
		user: process.env.REDIS_USER,
		password: process.env.REDIS_PASSWORD
	},
	// @feature:start temporal
	temporal: {
		address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
		namespace: process.env.TEMPORAL_NAMESPACE || 'default',
		taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'main',
		tls: {
			ca: process.env.TEMPORAL_TLS_CA ?? '',
			cert: process.env.TEMPORAL_TLS_CERT ?? '',
			key: process.env.TEMPORAL_TLS_KEY ?? ''
		}
	},
	// @feature:end
	// @feature:start worker-browser
	// Empty means "let Puppeteer use its bundled Chromium". In a slim container
	// image you install Chromium separately and point this at it.
	puppeteer: {
		executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? ''
	}
	// @feature:end
};

export default config;
