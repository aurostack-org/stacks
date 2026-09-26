import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * The single door onto the environment.
 *
 * App code must never read `process.env` directly — go through the injected
 * `CustomConfigService` instead. Everything is validated once, at boot, with
 * `abortEarly: true`, so a missing variable fails the process immediately
 * rather than surfacing as `undefined` deep inside a request.
 *
 * Adding a variable means three edits in this file: the interface, the Joi
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

	// @feature:start observability
	export interface Logger {
		level: string;
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

	// @feature:start openapi, queue, observability
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

	export interface OAuthGoogle {
		clientId: string;
		clientSecret: string;
	}

	export interface OAuth {
		google: OAuthGoogle;
	}

	export interface Env {
		app: App;
		logger: Logger; // @feature observability
		database: Database;
		redis: Redis; // @feature cache
		basicAuth: BasicAuth; // @feature openapi, queue, observability
		betterAuth: BetterAuth;
		growthbook: Growthbook; // @feature feature-flags
		superuser: Superuser;
		smtp: SMTP; // @feature mail
		s3: S3; // @feature media
		rateLimit: RateLimit; // @feature rate-limit
		oauth: OAuth;
	}

	const { env } = process;

	export const schema = Joi.object({
		APP_ENV: Joi.string()
			.valid('development', 'production', 'test')
			.default('development')
			.required(),
		APP_HOST: Joi.string().required(),
		APP_NAME: Joi.string().required(),
		SERVER_HOST: Joi.string().required(),
		FRONTEND_HOST: Joi.string().required(),
		MISC_CORS_ORIGINS: Joi.string().allow('').default(''),
		PORT: Joi.number().default(5000).required(),
		DATABASE_URL: Joi.string().required(),
		BETTER_AUTH_SECRET: Joi.string().required(),
		BETTER_AUTH_URL: Joi.string().required(),
		BETTER_AUTH_COOKIE_DOMAIN: Joi.string().required(),
		BETTER_AUTH_COOKIE_PREFIX: Joi.string().required(),
		SUPERUSER_EMAIL: Joi.string().required(),
		SUPERUSER_PASSWORD: Joi.string().required(),
		OAUTH_GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
		OAUTH_GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
		// @feature:start observability
		LOG_LEVEL: Joi.string().default('info'),
		// @feature:end
		// @feature:start openapi, queue, observability
		BASIC_AUTH_USER: Joi.string().required(),
		BASIC_AUTH_PASS: Joi.string().required(),
		// @feature:end
		// @feature:start cache
		REDIS_HOST: Joi.string().default('localhost').required(),
		REDIS_PORT: Joi.number().default(6379).required(),
		REDIS_USER: Joi.string().optional().allow(''),
		REDIS_PASSWORD: Joi.string().optional().allow(''),
		// @feature:end
		// @feature:start mail
		SMTP_HOST: Joi.string().required(),
		SMTP_PORT: Joi.string().valid('465', '587').required(),
		SMTP_SECURE: Joi.string().valid('true', 'false').required(),
		SMTP_USER: Joi.string().required(),
		SMTP_PASSWORD: Joi.string().required(),
		SMTP_FROM: Joi.string().required(),
		SMTP_SUPPORT_EMAIL: Joi.string().required(),
		// @feature:end
		// @feature:start media
		S3_REGION: Joi.string().default('us-east-1'),
		S3_ENDPOINT: Joi.string().optional().allow(''),
		S3_BUCKET_NAME: Joi.string().required(),
		S3_ACCESS_KEY_ID: Joi.string().optional().allow(''),
		S3_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
		// @feature:end
		// @feature:start rate-limit
		RATE_LIMIT_ENABLED: Joi.string().valid('true', 'false').default('true'),
		RATE_LIMIT_TTL: Joi.number().default(60_000),
		RATE_LIMIT_MAX: Joi.number().default(120),
		RATE_LIMIT_AUTH_WINDOW: Joi.number().default(10),
		RATE_LIMIT_AUTH_MAX: Joi.number().default(100),
		RATE_LIMIT_IP_HEADERS: Joi.string().default('x-forwarded-for'),
		// @feature:end
		// @feature:start feature-flags
		GROWTHBOOK_API_HOST: Joi.string().required(),
		GROWTHBOOK_CLIENT_KEY: Joi.string().required()
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
		// @feature:start observability
		logger: {
			level: env.LOG_LEVEL || 'info'
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
		// @feature:start openapi, queue, observability
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

	// @feature:start observability
	get logger() {
		return this.config.get('logger', { infer: true });
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

	// @feature:start openapi, queue, observability
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

	get oauth() {
		return this.config.get('oauth', { infer: true });
	}
}

export default Config;
