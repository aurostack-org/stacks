import { FEED_ROOM, isJoinableRoom, channelRoom, userRoom } from '../constants';

describe('isJoinableRoom', () => {
	it('allows the feed and individual channel rooms', () => {
		expect(isJoinableRoom(FEED_ROOM)).toBe(true);
		expect(isJoinableRoom(channelRoom('clx123abc'))).toBe(true);
	});

	// The bug this closes: `room:join` used to call socket.join(body.room) with
	// whatever string arrived, so any authenticated user could join another
	// user's notification room and read their private notifications.
	it("refuses another user's private notification room", () => {
		expect(isJoinableRoom(userRoom('some-other-user-id'))).toBe(false);
		expect(isJoinableRoom('user:')).toBe(false);
	});

	it('refuses arbitrary and malformed room names', () => {
		expect(isJoinableRoom('')).toBe(false);
		expect(isJoinableRoom('feed:extra')).toBe(false);
		expect(isJoinableRoom('channel:')).toBe(false);
		expect(isJoinableRoom('channel:abc:def')).toBe(false);
		expect(isJoinableRoom('anything-at-all')).toBe(false);
	});

	it('is not fooled by a prefix that merely starts with a joinable room', () => {
		expect(isJoinableRoom('feedxyz')).toBe(false);
		expect(isJoinableRoom('xchannel:abc')).toBe(false);
	});
});
