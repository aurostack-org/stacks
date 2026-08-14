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

// @feature:start browser
interface Puppeteer {
	executablePath: string;
}
// @feature:end

interface Config {
	app: App;
	database: Database;
	redis: Redis;
	puppeteer: Puppeteer; // @feature browser
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
	// @feature:start browser
	// Empty means "let Puppeteer use its bundled Chromium". In a slim container
	// image you install Chromium separately and point this at it.
	puppeteer: {
		executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? ''
	}
	// @feature:end
};

export default config;
