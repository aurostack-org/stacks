import {
	BadRequestException,
	INestApplication,
	StandardSchemaSerializerInterceptor,
	StandardSchemaValidationPipe,
	VersioningType,
	Logger
} from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger'; // @feature openapi
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import helmet from 'helmet';
import express from 'express';
import expressBasicAuth from 'express-basic-auth'; // @feature openapi, queue
import { apiReference } from '@scalar/nestjs-api-reference'; // @feature openapi
import { AuthService } from '@thallesp/nestjs-better-auth'; // @feature openapi
import { Logger as PinoLogger } from 'nestjs-pino';
import { join } from 'path';
import {
	PrismaClientKnownRequestExceptionFilter,
	PrismaClientValidationExceptionFilter
} from 'common/exceptions';
import { CustomConfigService } from 'common/services';
import { CORS_OPTIONS } from 'common/constants';
import { SWAGGER_OPTIONS } from 'common/constants'; // @feature openapi
import { RedisIoAdapter } from 'realtime/adapters/redis-io.adapter'; // @feature realtime

export const enableVersioning = (app: INestApplication) => {
	app.enableVersioning({
		type: VersioningType.URI
	});
};

export const usePinoLogger = (app: INestApplication) => {
	const logger = app.get(PinoLogger);
	app.useLogger(logger);
};

export const setStatic = (app: INestApplication) => {
	app.use(express.static(join(__dirname, '..', '..', 'public')));
};

// Scoped JSON body parsing — excludes /auth so better-auth retains raw bodies.
export const enableJsonBodyParser = (app: INestApplication) => {
	const json = express.json();
	const urlencoded = express.urlencoded({ extended: true });
	app.use((req, res, next) => {
		if (req.path.startsWith('/auth')) return next();
		return json(req, res, next);
	});
	app.use((req, res, next) => {
		if (req.path.startsWith('/auth')) return next();
		return urlencoded(req, res, next);
	});
};

/**
 * Validate every `@Body/@Query/@Param({ schema })` against its Zod schema; the
 * handler receives the schema's output (coerced, defaulted, transformed).
 * Failures keep the API's error contract: one 400 whose message is
 * `Validation: <field>: <first problem>`.
 */
export const useGlobalPipes = (app: INestApplication) => {
	app.useGlobalPipes(
		new StandardSchemaValidationPipe({
			exceptionFactory: (issues) => {
				const [first] = issues;
				if (!first) return new BadRequestException('Validation failed');

				const path = (first.path ?? [])
					.map((segment) =>
						typeof segment === 'object' ? segment.key : segment
					)
					.join('.');
				return new BadRequestException(
					`Validation: ${path ? `${path}: ` : ''}${first.message}`
				);
			}
		})
	);
};

// Serialize responses through the schema a handler declares with @Returns().
export const useGlobalInterceptors = (app: INestApplication) => {
	app.useGlobalInterceptors(
		new StandardSchemaSerializerInterceptor(app.get(Reflector))
	);
};

// apply PrismaClientExceptionFilter to entire application,
// requires HttpAdapterHost because it extends BaseExceptionFilter
export const useGlobalFilters = (app: INestApplication) => {
	const { httpAdapter } = app.get(HttpAdapterHost);
	app.useGlobalFilters(
		new PrismaClientKnownRequestExceptionFilter(httpAdapter),
		new PrismaClientValidationExceptionFilter(httpAdapter)
	);
};

export const enableCors = (app: INestApplication) => {
	app.enableCors(CORS_OPTIONS);
};

// @feature:start realtime
/**
 * Attach the Redis-backed Socket.io adapter so realtime events fan out across
 * replicas. Must run before `start()` (i.e. before the HTTP server listens).
 */
export const enableRealtime = async (app: INestApplication) => {
	const config = app.get(CustomConfigService);
	const adapter = new RedisIoAdapter(app);
	await adapter.connectToRedis(config);
	app.useWebSocketAdapter(adapter);
};
// @feature:end

export const enableHelmet = (app: INestApplication) => {
	app.use(helmet());
};

// @feature:start openapi, queue
/**
 * Lock the operator-facing surfaces behind basic auth. Every path added here is
 * something that leaks internals if left open — the API reference and the queue
 * dashboard — so a new one belongs in this list on
 * the same commit that mounts it.
 */
export const enableBasicAuth = (app: INestApplication) => {
	const config = app.get(CustomConfigService);
	const { user, password } = config.basicAuth;

	app.use(
		[
			'/docs', // @feature openapi
			'/openapi-json', // @feature openapi
			'/dashboard' // @feature queue
		],
		expressBasicAuth({
			users: { [user]: password },
			challenge: true
		})
	);
};
// @feature:end

// @feature:start openapi
export const enableOpenAPI = async (app: INestApplication) => {
	const config = app.get(CustomConfigService);
	const auth = app.get(AuthService);
	const document = SwaggerModule.createDocument(app, SWAGGER_OPTIONS);
	SwaggerModule.setup('/openapi', app, document, {
		customSiteTitle: config.app.name
	});

	const authSchema = await auth.api.generateOpenAPISchema();

	app.use(
		'/docs',
		apiReference({
			theme: 'purple',
			sources: [
				{ slug: 'auth', title: 'Authentication', content: authSchema },
				{ slug: 'main', title: 'Main API', url: '/openapi-json', default: true }
			]
		})
	);
};
// @feature:end

export const start = async (app: INestApplication) => {
	const logger = new Logger('Bootstrap');
	const config = app.get(CustomConfigService);
	const { port, appHost, host } = config.app;
	await app.listen(port, appHost, () => {
		logger.debug(`\n\n-------------------------------------------------------\n\nApplication listening on:\n- http://${appHost}:${port}\n- ${host}\n\nAPI Documentation available at:\n- http://${appHost}:${port}/docs\n- ${host}/docs\n\n-------------------------------------------------------
	`);
	});
};
