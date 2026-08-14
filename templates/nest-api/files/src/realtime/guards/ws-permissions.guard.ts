import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Permission, hasPermission } from 'lib/access';
import { WS_PERMISSIONS_KEY } from '../decorators/ws-permissions.decorator';

/**
 * Enforces `@WsPermissions(...)` on socket message handlers.
 *
 * Runs after `WsAuthGuard`, which establishes *who* the socket is; this decides
 * *what* they may do. A handler with no `@WsPermissions` metadata is allowed —
 * identity alone is the requirement there.
 */
@Injectable()
export class WsPermissionsGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const required = this.reflector.getAllAndOverride<Permission | undefined>(
			WS_PERMISSIONS_KEY,
			[context.getHandler(), context.getClass()]
		);
		if (!required) return true;

		const socket = context.switchToWs().getClient<Socket>();
		const user = socket.data.user;
		if (!user) throw new WsException('Unauthorized');

		if (!hasPermission(user.role, required)) {
			throw new WsException('Forbidden');
		}
		return true;
	}
}
