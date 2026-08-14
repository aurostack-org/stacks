import { io, type Socket } from 'socket.io-client';
import { ClientEvent } from './realtime-events';

let socket: Socket | null = null;

/**
 * Connect the realtime Socket.IO client. The Better Auth session cookie is
 * carried on the handshake via withCredentials. Feature event wiring + the RTK
 * Query cache bridge land in Phase 2+.
 */
export function connectSocket(url: string): Socket {
	if (socket) {
		if (!socket.connected) socket.connect();
		return socket;
	}
	socket = io(url, {
		withCredentials: true,
		path: '/realtime',
		autoConnect: true
	});
	return socket;
}

export function getSocket(): Socket | null {
	return socket;
}

/** Join a server-side room (forum feed / thread). No-op until connected. */
export function joinRoom(room: string): void {
	socket?.emit(ClientEvent.JOIN_ROOM, { room });
}

/** Leave a previously joined room. */
export function leaveRoom(room: string): void {
	socket?.emit(ClientEvent.LEAVE_ROOM, { room });
}

export function disconnectSocket(): void {
	socket?.disconnect();
	socket = null;
}
