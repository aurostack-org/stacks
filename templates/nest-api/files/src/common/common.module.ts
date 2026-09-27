import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus'; // @feature observability
import { LoggerModule } from './modules';
// The queue module itself is generic; here it is only needed to register the
// `mail` queue, so it rides on the mail feature.
import { QueueModule } from './modules'; // @feature mail
import {
	GeneratorService,
	CustomConfigService,
	PrismaService,
	CustomAuthService
} from './services';
import { CacheService } from './services'; // @feature cache
import { MailService } from './services'; // @feature mail
import { RedisThrottlerStorage } from './services'; // @feature rate-limit
import { FeatureFlagService } from './services'; // @feature feature-flags
import { TemporalService } from './services'; // @feature temporal
import { HealthController } from './controllers'; // @feature observability
import { MailProcessor } from './processors'; // @feature mail
import { FeatureFlagGuard } from './guards'; // @feature feature-flags
import { PrismaHealthIndicator } from './misc'; // @feature observability
import Config from './services/config.service';

/**
 * Global infrastructure module. Everything listed in `exports` is injectable
 * anywhere without importing this module — extend that array when you add a
 * shared provider, or the rest of the app will not see it.
 */
@Global()
@Module({
	imports: [
		ConfigModule.forRoot({
			load: [Config.getVariables],
			validationSchema: Config.schema
		}),
		LoggerModule,
		// @feature:start observability
		TerminusModule,
		// @feature:end
		QueueModule.register('mail') // @feature mail
	],
	controllers: [
		HealthController // @feature observability
	],
	providers: [
		ConfigService,
		CustomConfigService,
		GeneratorService,
		PrismaService,
		CustomAuthService,
		CacheService, // @feature cache
		MailService, // @feature mail
		MailProcessor, // @feature mail
		RedisThrottlerStorage, // @feature rate-limit
		FeatureFlagService, // @feature feature-flags
		FeatureFlagGuard, // @feature feature-flags
		TemporalService, // @feature temporal
		PrismaHealthIndicator // @feature observability
	],
	exports: [
		CustomConfigService,
		GeneratorService,
		PrismaService,
		CustomAuthService,
		CacheService, // @feature cache
		MailService, // @feature mail
		RedisThrottlerStorage, // @feature rate-limit
		FeatureFlagService, // @feature feature-flags
		TemporalService // @feature temporal
	]
})
export class CommonModule {}
