import 'dotenv/config';
import { DocumentBuilder } from '@nestjs/swagger'; // @feature openapi
import { OriginBuilder } from '../misc';

// Read directly from `process.env`, not CustomConfigService: these constants are
// evaluated at module load, before Nest's DI container exists.
const { env: E } = process;

const port = E.PORT!;
const host = E.SERVER_HOST!;
const appHost = E.APP_HOST!;
const frontendHost = E.FRONTEND_HOST!;

const env = E.APP_ENV!;
const IS_DEV = env === 'development';

// Extra origins are a development convenience only — production is pinned to
// the configured frontend host.
const CORS_ORIGINS = !IS_DEV
	? [frontendHost]
	: [frontendHost, ...OriginBuilder.build(E.MISC_CORS_ORIGINS)];

// @feature:start openapi
const createDocumentBuilder = () => {
	const builder = new DocumentBuilder()
		.setTitle('Acme Corp API')
		.setDescription('API for the Acme Corp application')
		.setVersion('1.0')
		.addTag('App')
		.addTag('Users', 'User management and authentication')
		.addTag('Current User', 'Current authenticated user information')
		.addBearerAuth();

	builder.addServer(host);
	if (IS_DEV) {
		builder
			.addServer(`http://localhost:${port}`, 'Local Development')
			.addServer(`http://${appHost}:${port}`, 'Dynamic Development');
	}
	return builder.build();
};

export const SWAGGER_OPTIONS = createDocumentBuilder();
// @feature:end

export const CORS_OPTIONS = {
	origin: CORS_ORIGINS,
	credentials: true,
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
	preflightContinue: false,
	optionsSuccessStatus: 204
};
