import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Guards `@SubscribeMessage` handlers: the socket must already carry an
 * authenticated user (attached at connection time in `EventsGateway`). This is
 * defense-in-depth — unauthenticated sockets are disconnected on connect, but
 * message handlers should never trust that implicitly.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const socket = context.switchToWs().getClient<Socket>();
		if (!socket.data.user) {
			throw new WsException('Unauthorized');
		}
		return true;
	}
}
