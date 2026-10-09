import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IoRedis from 'ioredis';
import { CustomConfigService } from 'common/services';
import { CORS_OPTIONS } from 'common/constants';
import { SOCKET_PATH } from '../constants';

/**
 * Socket.io adapter backed by a Redis pub/sub pair.
 *
 * Every backend replica publishes emitted events onto Redis and subscribes to
 * the others, so a `server.to(room).emit(...)` fans out to clients regardless
 * of which instance holds their socket. This is the "Redis-backed adapter for
 * horizontal scaling" called for in the PRD (§3.1).
 *
 * Wire it in `main.ts` before `app.listen()`:
 *
 *   const adapter = new RedisIoAdapter(app);
 *   await adapter.connectToRedis(app.get(CustomConfigService));
 *   app.useWebSocketAdapter(adapter);
 */
export class RedisIoAdapter extends IoAdapter {
	private adapterConstructor?: ReturnType<typeof createAdapter>;

	constructor(private readonly app: INestApplicationContext) {
		super(app);
	}

	async connectToRedis(config: CustomConfigService): Promise<void> {
		const pubClient = new IoRedis({ ...config.redis });
		const subClient = pubClient.duplicate();
		this.adapterConstructor = createAdapter(pubClient, subClient);
	}

	createIOServer(port: number, options?: ServerOptions) {
		// IoAdapter types this as the full ServerOptions; socket.io fills the rest.
		const server = super.createIOServer(port, {
			...options,
			path: SOCKET_PATH,
			// Reuse the REST CORS allow-list so the browser can open the socket.
			cors: {
				origin: CORS_OPTIONS.origin,
				credentials: true
			}
		} as ServerOptions);

		// `connectToRedis` may not have run in envs where scaling is unnecessary
		// (e.g. tests); fall back to the default in-memory adapter in that case.
		if (this.adapterConstructor) {
			server.adapter(this.adapterConstructor);
		}

		return server;
	}
}
