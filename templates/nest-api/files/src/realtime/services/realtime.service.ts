import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { LoggerService } from 'common/services';
import { FEED_ROOM, ServerEvent, channelRoom, userRoom } from '../constants';

/**
 * The publish side of the realtime layer.
 *
 * Any module (queue processors, schedulers, REST services) can inject this to
 * push events to connected clients without depending on the gateway — which
 * would create a cycle and couple business logic to the transport. The gateway
 * hands us the live Socket.io `Server` in its `afterInit`; before that (or in
 * tests with no WS server) every emit is a safe no-op.
 */
@Injectable()
export class RealtimeService {
	private server?: Server;

	constructor(private readonly logger: LoggerService) {}

	/** Called once by the gateway when the Socket.io server is ready. */
	bindServer(server: Server) {
		this.server = server;
	}

	get isReady(): boolean {
		return !!this.server;
	}

	/** Deliver a notification to every socket belonging to one user. */
	notifyUser(userId: string, notification: unknown) {
		this.emitToRoom(userRoom(userId), ServerEvent.NOTIFICATION, notification);
	}

	/** Announce something to everyone watching the global feed. */
	emitToFeed(event: string, payload: unknown) {
		this.emitToRoom(FEED_ROOM, event, payload);
	}

	/** Push an update to everyone in one channel's room. */
	emitToChannel(channelId: string, payload: unknown) {
		this.emitToRoom(
			channelRoom(channelId),
			ServerEvent.CHANNEL_UPDATE,
			payload
		);
	}

	/** Low-level: emit to a specific room. */
	emitToRoom(room: string, event: string, payload: unknown) {
		if (!this.server) {
			this.logger.debug(
				{ room, event },
				'Realtime server not ready; dropping emit.'
			);
			return;
		}
		this.server.to(room).emit(event, payload);
	}

	/** Low-level: emit to every connected client. */
	broadcast(event: string, payload: unknown) {
		if (!this.server) {
			this.logger.debug(
				{ event },
				'Realtime server not ready; dropping broadcast.'
			);
			return;
		}
		this.server.emit(event, payload);
	}
}
