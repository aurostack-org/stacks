import { Global, Module } from '@nestjs/common';
import { EventsGateway } from './gateways/events.gateway';
import { PresenceService } from './services/presence.service';
import { RealtimeService } from './services/realtime.service';
import { WsAuthGuard, WsPermissionsGuard } from './guards';

/**
 * Realtime (Socket.io) layer. Marked `@Global` so cross-cutting publishers —
 * queue processors, schedulers and REST services — can
 * inject {@link RealtimeService} without importing this module everywhere.
 *
 * The Redis adapter for horizontal scaling is wired separately in `main.ts`
 * (`RedisIoAdapter`) because it must be attached to the app before `listen()`.
 */
@Global()
@Module({
	providers: [
		EventsGateway,
		PresenceService,
		RealtimeService,
		WsAuthGuard,
		WsPermissionsGuard
	],
	exports: [RealtimeService, PresenceService]
})
export class RealtimeModule {}
