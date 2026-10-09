import { Socket } from 'socket.io';
import { CustomAuthService } from 'common/services';

/** The authenticated identity we stash on `socket.data` after the handshake. */
export interface SocketUser {
	id: string;
	name: string;
	email: string;
	role?: string | null;
}

declare module 'socket.io' {
	interface SocketData {
		user?: SocketUser;
	}
}

/**
 * Resolve a better-auth session from a socket handshake.
 *
 * The browser sends the same session cookie it uses for REST, so we forward the
 * handshake headers to better-auth's `getSession`. Returns `null` when there is
 * no valid session — callers decide whether to disconnect.
 */
export const getSessionUserFromSocket = async (
	socket: Socket,
	auth: CustomAuthService
): Promise<SocketUser | null> => {
	// socket.io exposes handshake headers as a plain object; better-auth wants a
	// Fetch `Headers`. The cookie is the only header it needs.
	const headers = new Headers();
	const cookie = socket.handshake.headers.cookie;
	if (cookie) headers.set('cookie', cookie);

	// Also accept a bearer token (handy for native/PWA clients that can't rely on
	// cookies), mirroring better-auth's bearer support.
	const auth_header =
		socket.handshake.auth?.token ?? socket.handshake.headers.authorization;
	if (auth_header) {
		headers.set(
			'authorization',
			auth_header.startsWith('Bearer ') ? auth_header : `Bearer ${auth_header}`
		);
	}

	try {
		const session = await auth.api.getSession({ headers });
		if (!session?.user) return null;
		const { id, name, email, role } = session.user;
		return { id, name, email, role };
	} catch {
		return null;
	}
};
