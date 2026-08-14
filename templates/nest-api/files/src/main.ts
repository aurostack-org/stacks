import { NestFactory } from '@nestjs/core';
import { AppModule } from 'app.module';
import * as setup from './app.setup';

(async () => {
	// `bodyParser: false` is intentional — better-auth needs raw bodies on its
	// own routes. JSON parsing is re-applied everywhere else by
	// `enableJsonBodyParser` below. Do not re-enable it globally.
	const app = await NestFactory.create(AppModule, {
		bodyParser: false,
		bufferLogs: true
	});
	setup.usePinoLogger(app); // @feature observability
	setup.enableBasicAuth(app); // @feature openapi, queue, observability
	setup.enableVersioning(app);
	setup.setStatic(app);
	setup.enableJsonBodyParser(app);
	setup.useGlobalPipes(app);
	setup.useGlobalInterceptors(app);
	setup.useGlobalFilters(app);
	setup.useClassValidatorContainer(app);
	await setup.enableOpenAPI(app); // @feature openapi
	setup.enableCors(app);
	setup.enableHelmet(app);
	// Must run before `start()` — the websocket adapter has to be attached
	// before the HTTP server begins listening.
	await setup.enableRealtime(app); // @feature realtime
	await setup.start(app);
})();
