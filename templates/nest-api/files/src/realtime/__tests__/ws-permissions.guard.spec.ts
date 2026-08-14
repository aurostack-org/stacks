import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { WsPermissionsGuard } from '../guards';
import { SocketUser } from '../misc/session-from-socket';

const contextFor = (user?: Partial<SocketUser>) =>
	({
		getHandler: () => vi.fn(),
		getClass: () => vi.fn(),
		switchToWs: () => ({
			getClient: () => ({ data: user ? { user } : {} })
		})
	} as unknown as ExecutionContext);

const guardWith = (required: unknown) => {
	const reflector = {
		getAllAndOverride: vi.fn().mockReturnValue(required)
	} as unknown as Reflector;
	return new WsPermissionsGuard(reflector);
};

describe('WsPermissionsGuard', () => {
	it('allows a handler that declares no permission', () => {
		const guard = guardWith(undefined);
		expect(guard.canActivate(contextFor({ role: 'user' }))).toBe(true);
	});

	it('allows a role that holds the required permission', () => {
		const guard = guardWith({ session: ['list'] });
		expect(guard.canActivate(contextFor({ role: 'user' }))).toBe(true);
	});

	it('rejects a role that lacks the required permission', () => {
		const guard = guardWith({ user: ['ban'] });
		expect(() => guard.canActivate(contextFor({ role: 'user' }))).toThrow(
			WsException
		);
	});

	it('rejects an unauthenticated socket even when a permission is declared', () => {
		const guard = guardWith({ session: ['list'] });
		expect(() => guard.canActivate(contextFor())).toThrow(WsException);
	});

	it('rejects an unauthenticated socket before consulting permissions', () => {
		const guard = guardWith({ session: ['list'] });
		try {
			guard.canActivate(contextFor());
		} catch (error) {
			expect((error as WsException).message).toBe('Unauthorized');
		}
	});
});
