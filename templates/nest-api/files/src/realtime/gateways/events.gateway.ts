import { UseGuards } from '@nestjs/common';
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CustomAuthService, LoggerService } from 'common/services';
import { PresenceService } from '../services/presence.service';
import { RealtimeService } from '../services/realtime.service';
import { WsAuthGuard, WsPermissionsGuard } from '../guards';
import { getSessionUserFromSocket } from '../misc/session-from-socket';
import { ClientEvent, ServerEvent, isJoinableRoom, userRoom } from '../constants';

/**
 * Central Socket.io gateway.
 *
 * Responsibilities (PRD §2.2 / §3.1):
 *  - Authenticate every socket against the better-auth session on connect.
 *  - Maintain online-user presence across replicas (via {@link PresenceService}).
 *  - Let clients subscribe to live market rooms for price tickers.
 *  - Relay lightweight activity signals (typing / viewing) within a room.
 *
 * The `cors` / `path` for the server are configured on the Redis adapter
 * (`RedisIoAdapter`), so the decorator stays option-free.
 */
@WebSocketGateway()
// Applied at class level so a newly added handler is guarded by default rather
// than by remembering to decorate it. `handleConnection` is not a message
// handler and is unaffected — it does its own session check.
/**
 * Guards are applied at the **class** level, so every `@SubscribeMessage`
 * handler is covered by default — Nest concatenates class- then method-level
 * guard metadata. `WsAuthGuard` establishes identity; `WsPermissionsGuard`
 * enforces `@WsPermissions({ <resource>: ['<action>'] })` from
 * `realtime/decorators`, which is the only authorization path websockets get
 * (they never traverse the HTTP `AuthGuard`).
 */
@UseGuards(WsAuthGuard, WsPermissionsGuard)
export class EventsGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer() private server!: Server;

	constructor(
		private readonly auth: CustomAuthService,
		private readonly presence: PresenceService,
		private readonly realtime: RealtimeService,
		private readonly logger: LoggerService
	) {}

	afterInit(server: Server) {
		// Hand the live server to the publisher so other modules can emit.
		this.realtime.bindServer(server);
		this.logger.debug('Realtime gateway initialized.');
	}

	async handleConnection(socket: Socket) {
		const user = await getSessionUserFromSocket(socket, this.auth);
		if (!user) {
			// No valid session — refuse the connection.
			socket.emit('error', { message: 'Unauthorized' });
			socket.disconnect(true);
			return;
		}

		socket.data.user = user;
		// Every socket of a user joins their personal room for direct messaging.
		await socket.join(userRoom(user.id));

		const cameOnline = await this.presence.connect(user.id);
		if (cameOnline) {
			this.server.emit(ServerEvent.PRESENCE_UPDATE, {
				userId: user.id,
				status: 'online'
			});
		}

		this.logger.debug(
			{ userId: user.id, socketId: socket.id },
			'Socket connected.'
		);
	}

	async handleDisconnect(socket: Socket) {
		const user = socket.data.user;
		if (!user) return;

		const wentOffline = await this.presence.disconnect(user.id);
		if (wentOffline) {
			this.server.emit(ServerEvent.PRESENCE_UPDATE, {
				userId: user.id,
				status: 'offline'
			});
		}

		this.logger.debug(
			{ userId: user.id, socketId: socket.id },
			'Socket disconnected.'
		);
	}

	// --- Presence ----------------------------------------------------------

	@SubscribeMessage('presence:list')
	async listOnline() {
		const userIds = await this.presence.online();
		return { event: ServerEvent.PRESENCE_UPDATE, data: { online: userIds } };
	}

	// --- Rooms --------------------------------------------------------------

	@SubscribeMessage(ClientEvent.JOIN_ROOM)
	async joinRoom(
		@ConnectedSocket() socket: Socket,
		@MessageBody() body: { room: string }
	) {
		// Only rooms on the allowlist are joinable this way. `user:<id>` is not —
		// it would hand the caller another user's private notifications.
		if (!isJoinableRoom(body.room)) {
			throw new WsException('Forbidden');
		}
		await socket.join(body.room);
		return { ok: true, room: body.room };
	}

	@SubscribeMessage(ClientEvent.LEAVE_ROOM)
	async leaveRoom(
		@ConnectedSocket() socket: Socket,
		@MessageBody() body: { room: string }
	) {
		await socket.leave(body.room);
		return { ok: true };
	}

	// --- Activity signals (who is typing / viewing) ------------------------

	@SubscribeMessage(ClientEvent.TYPING)
	typing(
		@ConnectedSocket() socket: Socket,
		@MessageBody() body: { room: string; isTyping: boolean }
	) {
		this.assertInRoom(socket, body.room);
		// Relay to everyone else in the room — never echo back to the sender.
		socket.to(body.room).emit(ServerEvent.TYPING, {
			room: body.room,
			userId: socket.data.user!.id,
			name: socket.data.user!.name,
			isTyping: body.isTyping
		});
	}

	@SubscribeMessage(ClientEvent.VIEWING)
	viewing(
		@ConnectedSocket() socket: Socket,
		@MessageBody() body: { room: string; viewing: boolean }
	) {
		this.assertInRoom(socket, body.room);
		socket.to(body.room).emit(ServerEvent.VIEWING, {
			room: body.room,
			userId: socket.data.user!.id,
			viewing: body.viewing
		});
	}

	/**
	 * A client may only signal into a room it actually occupies. Otherwise it
	 * could emit forged typing/viewing events into any room by name, including
	 * another user's `user:<id>` room.
	 */
	private assertInRoom(socket: Socket, room: string) {
		if (!socket.rooms.has(room)) {
			throw new WsException('Not in room');
		}
	}
}
