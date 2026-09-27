import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios'; // @feature http-client
import { ScheduleModule } from '@nestjs/schedule'; // @feature scheduler
import { MailerModule } from '@nestjs-modules/mailer'; // @feature mail
import { BullModule } from '@nestjs/bullmq'; // @feature queue
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'; // @feature rate-limit
import { AuthModule, AuthGuard } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, openAPI } from 'better-auth/plugins';
import { BullBoardModule } from '@bull-board/nestjs'; // @feature queue
import { GraphQLModule } from '@nestjs/graphql'; // @feature graphql
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'; // @feature graphql
import { ExpressAdapter } from '@bull-board/express'; // @feature queue
import { CustomConfigService, PrismaService } from 'common/services';
import { MailService } from 'common/services'; // @feature mail
// @feature:start rate-limit
import {
	CacheService,
	RedisThrottlerStorage,
	createAuthRateLimitStorage
} from 'common/services';
// @feature:end
import { getClientIp } from 'common/utils'; // @feature rate-limit
import { CommonModule } from 'common/common.module';
import { UsersModule } from 'users/users.module'; // @feature users
import { MediaModule } from 'media/media.module'; // @feature media
import { RealtimeModule } from 'realtime/realtime.module'; // @feature realtime
import { NotificationsModule } from 'notifications/notifications.module'; // @feature notifications
import { AppController } from 'app.controller';
import { AppResolver } from 'app.resolver'; // @feature graphql
import { ac, roles } from 'lib/access';
import { AUTH_RATE_LIMIT_RULES } from 'lib/rate-limit'; // @feature rate-limit
import { OriginBuilder } from 'common/misc';

@Module({
	imports: [
		CommonModule,
		AuthModule.forRootAsync({
			inject: [
				PrismaService,
				CustomConfigService,
				MailService, // @feature mail
				CacheService // @feature rate-limit
			],
			useFactory: (
				db: PrismaService,
				config: CustomConfigService,
				mail: MailService, // @feature mail
				cache: CacheService // @feature rate-limit
			) => ({
				auth: betterAuth({
					appName: config.app.name,
					secret: config.betterAuth.secret,
					baseURL: config.betterAuth.url,
					basePath: '/auth',
					database: prismaAdapter(db, {
						provider: 'postgresql'
					}),
					// @feature:start rate-limit
					// better-auth's limiter only guards `/auth/*` — every other route
					// is covered by ThrottlerGuard below.
					rateLimit: {
						// better-auth defaults to production-only; follow RATE_LIMIT_ENABLED
						// instead, so dev is limited too and tests can opt out (and back in).
						enabled: config.rateLimit.enabled,
						window: config.rateLimit.authWindow,
						max: config.rateLimit.authMax,
						customRules: AUTH_RATE_LIMIT_RULES,
						customStorage: createAuthRateLimitStorage(cache)
					},
					// @feature:end
					advanced: {
						// @feature:start rate-limit
						ipAddress: {
							// Without this, `getIp` behind a proxy resolves every request
							// to the proxy's address — and if it resolves nothing at all,
							// better-auth skips rate limiting entirely with a warning.
							ipAddressHeaders: config.rateLimit.ipHeaders
						},
						// @feature:end
						// Share the session cookie across subdomains so one login covers
						// every frontend. Domain comes from BETTER_AUTH_COOKIE_DOMAIN
						// (`.lvh.me` in dev, your apex in production).
						cookiePrefix: config.betterAuth.cookiePrefix,
						crossSubDomainCookies: {
							enabled: true,
							domain: config.betterAuth.cookieDomain
						},
						database: {
							joins: true
						}
					},
					user: {
						additionalFields: {
							// Example of an extra session-borne field. `input: false` is
							// load-bearing on anything the client must not be able to set
							// for itself — without it, a signup payload could grant it.
							onboardingCompletedAt: {
								type: 'date',
								required: false,
								input: false
							}
						}
					},
					socialProviders: {
						google: {
							clientId: config.oauth.google.clientId,
							clientSecret: config.oauth.google.clientSecret,
							scope: ['email', 'profile'],
							redirectURI: `${config.betterAuth.url}/auth/callback/google`,
							accessType: 'offline',
							prompt: 'select_account consent'
						}
					},
					emailAndPassword: {
						enabled: true,
						// @feature:start mail
						requireEmailVerification: true,
						sendResetPassword: async ({ user, url, token }) => {
							mail.forgotPassword({
								to: user.email,
								token,
								url
							});
						},
						onPasswordReset: async ({ user }) => {
							mail.resetPassword(user.email);
						}
						// @feature:end
					},
					// @feature:start mail
					emailVerification: {
						sendOnSignUp: true,
						sendVerificationEmail: async ({ user, url, token }) => {
							mail.activation({
								to: user.email,
								token,
								firstName: user.name.split(' ')[0],
								url
							});
						},
						afterEmailVerification: async ({ email, name }) => {
							mail.welcome({
								to: email,
								firstName: name,
								supportEmail: config.smtp.supportEmail,
								clientLoginPage: config.app.frontendHost
							});
						}
					},
					// @feature:end
					plugins: [
						admin({
							defaultRole: 'user',
							ac,
							roles
						}),
						openAPI() // @feature openapi
					],
					trustedOrigins: [
						config.app.frontendHost,
						...OriginBuilder.build(config.app.miscCorsOrigins)
					]
				}),
				middleware: (req, _, next) => {
					req.url = req.originalUrl;
					req.baseUrl = '';
					next();
				}
			})
		}),
		// @feature:start mail
		MailerModule.forRootAsync({
			imports: [],
			inject: [CustomConfigService],
			useFactory: async (config: CustomConfigService) => ({
				defaults: {
					from: config.smtp.from
				},
				transport: {
					host: config.smtp.host,
					port: config.smtp.port,
					secure: config.smtp.secure,
					auth: {
						user: config.smtp.user,
						pass: config.smtp.password
					}
				}
			})
		}),
		// @feature:end
		HttpModule.registerAsync({ useFactory: () => ({ timeout: 5000 }) }), // @feature http-client
		// @feature:start queue
		BullModule.forRootAsync({
			inject: [CustomConfigService],
			useFactory: async (config: CustomConfigService) => ({
				connection: {
					host: config.redis.host,
					port: config.redis.port,
					username: config.redis.username,
					password: config.redis.password
				},
				defaultJobOptions: {
					removeOnComplete: true
				}
			})
		}),
		BullBoardModule.forRoot({
			route: '/dashboard',
			adapter: ExpressAdapter
		}),
		// @feature:end
		// @feature:start rate-limit
		ThrottlerModule.forRootAsync({
			inject: [CustomConfigService, RedisThrottlerStorage],
			useFactory: (
				config: CustomConfigService,
				storage: RedisThrottlerStorage
			) => ({
				throttlers: [
					{
						name: 'default',
						ttl: config.rateLimit.ttl,
						limit: config.rateLimit.limit
					}
				],
				storage,
				getTracker: (req) => getClientIp(req, config.rateLimit.ipHeaders),
				skipIf: () => !config.rateLimit.enabled
			})
		}),
		// @feature:end
		// @feature:start graphql
		// Code-first GraphQL alongside the REST controllers. The schema file is
		// generated from resolvers at boot; add resolvers to any feature module
		// and they are picked up automatically.
		GraphQLModule.forRoot<ApolloDriverConfig>({
			driver: ApolloDriver,
			autoSchemaFile: true,
			graphiql: false
		}),
		// @feature:end
		ScheduleModule.forRoot(), // @feature scheduler
		UsersModule, // @feature users
		MediaModule, // @feature media
		RealtimeModule, // @feature realtime
		NotificationsModule // @feature notifications
	],
	controllers: [AppController],
	providers: [
		AppResolver, // @feature graphql
		// Order matters: Nest runs global guards in registration order, so floods
		// are rejected before AuthGuard does a session lookup and hits the DB.
		// @feature:start rate-limit
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard
		},
		// @feature:end
		{
			provide: APP_GUARD,
			useClass: AuthGuard
		}
	]
})
export class AppModule {}
