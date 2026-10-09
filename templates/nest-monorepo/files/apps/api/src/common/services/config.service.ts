import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

/**
 * The single door onto the environment.
 *
 * App code must never read `process.env` directly — go through the injected
 * `CustomConfigService` instead. Everything is validated once, at boot, against
 * the Zod `schema`, so a missing variable fails the process immediately rather
 * than surfacing as `undefined` deep inside a request.
 *
 * Adding a variable means three edits in this file: the interface, the Zod
 * schema, and `getVariables` — plus a line in `.env.example`.
 */
namespace Config {
	export interface App {
		name: string;
		twofaAppName: string;
		env: string;
		host: string;
		appHost: string;
		frontendHost: string;
		miscCorsOrigins?: string;
		port: number;
		key: string;
	}

	export interface Logger {
		level: string;
	}

	// @feature:start observability
	/** Limits past which /health reports the process as down. */
	export interface Health {
		heapMaxMb: number;
		rssMaxMb: number;
		/** Fraction of `diskPath`'s volume that may be used, 0–1. */
		diskThreshold: number;
		diskPath: string;
	}
	// @feature:end

	export interface Database {
		url: string;
	}

	// @feature:start cache
	export interface Redis {
		host: string;
		port: number;
		username?: string;
		password?: string;
	}
	// @feature:end

	// @feature:start openapi, queue
	export interface BasicAuth {
		user: string;
		password: string;
	}
	// @feature:end

	export interface BetterAuth {
		secret: string;
		url: string;
		cookieDomain: string;
		cookiePrefix: string;
	}

	// @feature:start feature-flags
	export interface Growthbook {
		apiHost: string;
		clientKey: string;
	}
	// @feature:end

	export interface Superuser {
		email: string;
		username: string;
		password: string;
	}

	// @feature:start mail
	export interface SMTP {
		host: string;
		port: number;
		user: string;
		password: string;
		from: string;
		supportEmail: string;
		secure: boolean;
	}
	// @feature:end

	// @feature:start media
	export interface S3 {
		accessKeyId: string;
		secretAccessKey: string;
		endpoint: string;
		bucket: string;
		region: string;
	}
	// @feature:end

	// @feature:start rate-limit
	export interface RateLimit {
		enabled: boolean;
		ttl: number;
		limit: number;
		authWindow: number;
		authMax: number;
		ipHeaders: string[];
	}
	// @feature:end

	// @feature:start temporal
	export interface Temporal {
		address: string;
		namespace: string;
		/** Where workflows started from here are queued (the worker polls it). */
		taskQueue: string;
		/** PEM; all empty means plaintext (the local dev server). */
		tls: { ca: string; cert: string; key: string };
	}
	// @feature:end

	export interface OAuthGoogle {
		clientId: string;
		clientSecret: string;
	}

	export interface OAuth {
		google: OAuthGoogle;
	}

	export interface Env {
		app: App;
		logger: Logger;
		health: Health; // @feature observability
		database: Database;
		redis: Redis; // @feature cache
		basicAuth: BasicAuth; // @feature openapi, queue
		betterAuth: BetterAuth;
		growthbook: Growthbook; // @feature feature-flags
		superuser: Superuser;
		smtp: SMTP; // @feature mail
		s3: S3; // @feature media
		rateLimit: RateLimit; // @feature rate-limit
		temporal: Temporal; // @feature temporal
		oauth: OAuth;
	}

	const { env } = process;

	// Env primitives: a required string must be non-empty, and a number arrives
	// as text that must parse (a blank is an error, not 0).
	const str = () => z.string().min(1);
	const num = (schema: z.ZodNumber = z.number()) =>
		z.string().trim().min(1).transform(Number).pipe(schema);

	export const schema = z.object({
		APP_ENV: z
			.enum(['development', 'production', 'test'])
			.default('development'),
		APP_HOST: str(),
		APP_NAME: str(),
		SERVER_HOST: str(),
		FRONTEND_HOST: str(),
		MISC_CORS_ORIGINS: z.string().default(''),
		PORT: num().default(5000),
		DATABASE_URL: str(),
		BETTER_AUTH_SECRET: str(),
		BETTER_AUTH_URL: str(),
		BETTER_AUTH_COOKIE_DOMAIN: z.string().default(''),
		BETTER_AUTH_COOKIE_PREFIX: str(),
		SUPERUSER_EMAIL: str(),
		SUPERUSER_PASSWORD: str(),
		OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
		OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
		LOG_LEVEL: str().default('info'),
		// @feature:start observability
		HEALTH_HEAP_MAX_MB: num(z.number().positive()).default(300),
		HEALTH_RSS_MAX_MB: num(z.number().positive()).default(300),
		HEALTH_DISK_THRESHOLD: num(z.number().min(0).max(1)).default(0.8),
		HEALTH_DISK_PATH: str().default('/'),
		// @feature:end
		// @feature:start openapi, queue
		BASIC_AUTH_USER: str(),
		BASIC_AUTH_PASS: str(),
		// @feature:end
		// @feature:start cache
		REDIS_HOST: str().default('localhost'),
		REDIS_PORT: num().default(6379),
		REDIS_USER: z.string().optional(),
		REDIS_PASSWORD: z.string().optional(),
		// @feature:end
		// @feature:start mail
		SMTP_HOST: str(),
		SMTP_PORT: z.enum(['465', '587']),
		SMTP_SECURE: z.enum(['true', 'false']),
		SMTP_USER: str(),
		SMTP_PASSWORD: str(),
		SMTP_FROM: str(),
		SMTP_SUPPORT_EMAIL: str(),
		// @feature:end
		// @feature:start media
		S3_REGION: str().default('us-east-1'),
		S3_ENDPOINT: z.string().optional(),
		S3_BUCKET_NAME: str(),
		S3_ACCESS_KEY_ID: z.string().optional(),
		S3_SECRET_ACCESS_KEY: z.string().optional(),
		// @feature:end
		// @feature:start rate-limit
		RATE_LIMIT_ENABLED: z.enum(['true', 'false']).default('true'),
		RATE_LIMIT_TTL: num().default(60_000),
		RATE_LIMIT_MAX: num().default(120),
		RATE_LIMIT_AUTH_WINDOW: num().default(10),
		RATE_LIMIT_AUTH_MAX: num().default(100),
		RATE_LIMIT_IP_HEADERS: str().default('x-forwarded-for'),
		// @feature:end
		// @feature:start temporal
		TEMPORAL_ADDRESS: str().default('localhost:7233'),
		TEMPORAL_NAMESPACE: str().default('default'),
		TEMPORAL_TASK_QUEUE: str().default('main'),
		TEMPORAL_TLS_CA: z.string().default(''),
		TEMPORAL_TLS_CERT: z.string().default(''),
		TEMPORAL_TLS_KEY: z.string().default(''),
		// @feature:end
		// @feature:start feature-flags
		GROWTHBOOK_API_HOST: str(),
		GROWTHBOOK_CLIENT_KEY: str()
		// @feature:end
	});

	export const getVariables = (): Config.Env => ({
		app: {
			name: env.APP_NAME || '',
			twofaAppName: env.TWOFA_APP_NAME || env.APP_NAME || '',
			env: env.APP_ENV || '',
			host: env.SERVER_HOST || '',
			appHost: env.APP_HOST || '',
			frontendHost: env.FRONTEND_HOST || '',
			miscCorsOrigins: env.MISC_CORS_ORIGINS,
			port: Number(env.PORT) || 5000,
			key: env.APP_KEY || ''
		},
		logger: {
			level: env.LOG_LEVEL || 'info'
		},
		// @feature:start observability
		health: {
			heapMaxMb: Number(env.HEALTH_HEAP_MAX_MB) || 300,
			rssMaxMb: Number(env.HEALTH_RSS_MAX_MB) || 300,
			diskThreshold: env.HEALTH_DISK_THRESHOLD
				? Number(env.HEALTH_DISK_THRESHOLD)
				: 0.8,
			diskPath: env.HEALTH_DISK_PATH || '/'
		},
		// @feature:end
		database: {
			url: env.DATABASE_URL || ''
		},
		// @feature:start cache
		redis: {
			host: env.REDIS_HOST || 'localhost',
			port: Number(env.REDIS_PORT) || 6379,
			username: env.REDIS_USER || '',
			password: env.REDIS_PASSWORD || ''
		},
		// @feature:end
		// @feature:start openapi, queue
		basicAuth: {
			user: env.BASIC_AUTH_USER || 'user',
			password: env.BASIC_AUTH_PASS || 'password'
		},
		// @feature:end
		betterAuth: {
			secret: env.BETTER_AUTH_SECRET || '',
			url: env.BETTER_AUTH_URL || env.SERVER_HOST || '',
			cookieDomain: env.BETTER_AUTH_COOKIE_DOMAIN || '',
			cookiePrefix: env.BETTER_AUTH_COOKIE_PREFIX || ''
		},
		// @feature:start feature-flags
		growthbook: {
			apiHost: env.GROWTHBOOK_API_HOST || '',
			clientKey: env.GROWTHBOOK_CLIENT_KEY || ''
		},
		// @feature:end
		superuser: {
			email: env.SUPERUSER_EMAIL || '',
			username: env.SUPERUSER_USERNAME || '',
			password: env.SUPERUSER_PASSWORD || ''
		},
		// @feature:start mail
		smtp: {
			host: env.SMTP_HOST || '',
			port: Number(env.SMTP_PORT) || 465,
			user: env.SMTP_USER || '',
			password: env.SMTP_PASSWORD || '',
			from: env.SMTP_FROM || '',
			secure: env.SMTP_SECURE === 'true',
			supportEmail: env.SMTP_SUPPORT_EMAIL || ''
		},
		// @feature:end
		// @feature:start media
		s3: {
			accessKeyId: env.S3_ACCESS_KEY_ID || '',
			secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
			endpoint: env.S3_ENDPOINT || '',
			bucket: env.S3_BUCKET_NAME || '',
			region: env.S3_REGION || 'us-east-1'
		},
		// @feature:end
		// @feature:start rate-limit
		rateLimit: {
			enabled: env.RATE_LIMIT_ENABLED !== 'false',
			ttl: Number(env.RATE_LIMIT_TTL) || 60_000,
			limit: Number(env.RATE_LIMIT_MAX) || 120,
			authWindow: Number(env.RATE_LIMIT_AUTH_WINDOW) || 10,
			authMax: Number(env.RATE_LIMIT_AUTH_MAX) || 100,
			ipHeaders: (env.RATE_LIMIT_IP_HEADERS || 'x-forwarded-for')
				.split(',')
				.map((header) => header.trim().toLowerCase())
				.filter(Boolean)
		},
		// @feature:end
		// @feature:start temporal
		temporal: {
			address: env.TEMPORAL_ADDRESS || 'localhost:7233',
			namespace: env.TEMPORAL_NAMESPACE || 'default',
			taskQueue: env.TEMPORAL_TASK_QUEUE || 'main',
			tls: {
				ca: env.TEMPORAL_TLS_CA || '',
				cert: env.TEMPORAL_TLS_CERT || '',
				key: env.TEMPORAL_TLS_KEY || ''
			}
		},
		// @feature:end
		oauth: {
			google: {
				clientId: env.OAUTH_GOOGLE_CLIENT_ID || '',
				clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET || ''
			}
		}
	});
}

@Injectable()
export class CustomConfigService {
	constructor(private readonly config: ConfigService<Config.Env, true>) {}

	get app() {
		return this.config.get('app', { infer: true });
	}

	get logger() {
		return this.config.get('logger', { infer: true });
	}

	// @feature:start observability
	get health() {
		return this.config.get('health', { infer: true });
	}
	// @feature:end

	get database() {
		return this.config.get('database', { infer: true });
	}

	// @feature:start cache
	get redis() {
		return this.config.get('redis', { infer: true });
	}
	// @feature:end

	// @feature:start openapi, queue
	get basicAuth() {
		return this.config.get('basicAuth', { infer: true });
	}
	// @feature:end

	get betterAuth() {
		return this.config.get('betterAuth', { infer: true });
	}

	// @feature:start feature-flags
	get growthbook() {
		return this.config.get('growthbook', { infer: true });
	}
	// @feature:end

	get superuser() {
		return this.config.get('superuser', { infer: true });
	}

	// @feature:start mail
	get smtp() {
		return this.config.get('smtp', { infer: true });
	}
	// @feature:end

	// @feature:start media
	get s3() {
		return this.config.get('s3', { infer: true });
	}
	// @feature:end

	// @feature:start rate-limit
	get rateLimit() {
		return this.config.get('rateLimit', { infer: true });
	}
	// @feature:end

	// @feature:start temporal
	get temporal() {
		return this.config.get('temporal', { infer: true });
	}
	// @feature:end

	get oauth() {
		return this.config.get('oauth', { infer: true });
	}
}

export default Config;
