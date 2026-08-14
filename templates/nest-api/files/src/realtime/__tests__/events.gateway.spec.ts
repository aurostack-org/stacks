import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { EventsGateway } from '../gateways/events.gateway';
import { FEED_ROOM, channelRoom, userRoom } from '../constants';

const makeSocket = (rooms: string[] = []) =>
	({
		id: 'socket-1',
		data: {
			user: { id: 'me', name: 'Me', email: 'me@test.com', role: 'user' }
		},
		rooms: new Set(['socket-1', ...rooms]),
		join: vi.fn().mockResolvedValue(undefined),
		leave: vi.fn().mockResolvedValue(undefined),
		to: vi.fn().mockReturnValue({ emit: vi.fn() })
	} as unknown as Socket);

const makeGateway = () =>
	new EventsGateway(
		{} as never,
		{ online: vi.fn() } as never,
		{ bindServer: vi.fn() } as never,
		{ debug: vi.fn() } as never
	);

describe('EventsGateway', () => {
	describe('joinRoom', () => {
		it('joins an allowed channel room', async () => {
			const gateway = makeGateway();
			const socket = makeSocket();

			await expect(
				gateway.joinRoom(socket, { room: channelRoom('clx1') })
			).resolves.toEqual({ ok: true, room: channelRoom('clx1') });
			expect(socket.join).toHaveBeenCalledWith(channelRoom('clx1'));
		});

		it("refuses to join another user's notification room", async () => {
			const gateway = makeGateway();
			const socket = makeSocket();

			await expect(
				gateway.joinRoom(socket, { room: userRoom('victim') })
			).rejects.toThrow(WsException);
			expect(socket.join).not.toHaveBeenCalled();
		});

		it('refuses to join a room that is not on the allowlist', async () => {
			const gateway = makeGateway();
			const socket = makeSocket();

			await expect(
				gateway.joinRoom(socket, { room: 'admin:secrets' })
			).rejects.toThrow(WsException);
			expect(socket.join).not.toHaveBeenCalled();
		});
	});

	describe('typing / viewing', () => {
		it('relays into a room the socket occupies', () => {
			const gateway = makeGateway();
			const socket = makeSocket([FEED_ROOM]);

			gateway.typing(socket, { room: FEED_ROOM, isTyping: true });
			expect(socket.to).toHaveBeenCalledWith(FEED_ROOM);
		});

		it('refuses to forge a typing signal into a room it never joined', () => {
			const gateway = makeGateway();
			const socket = makeSocket();

			expect(() =>
				gateway.typing(socket, { room: userRoom('victim'), isTyping: true })
			).toThrow(WsException);
			expect(socket.to).not.toHaveBeenCalled();
		});

		it('refuses to forge a viewing signal into a room it never joined', () => {
			const gateway = makeGateway();
			const socket = makeSocket();

			expect(() =>
				gateway.viewing(socket, { room: channelRoom('clx1'), viewing: true })
			).toThrow(WsException);
			expect(socket.to).not.toHaveBeenCalled();
		});
	});
});
