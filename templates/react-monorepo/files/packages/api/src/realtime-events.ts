/**
 * Frontend mirror of the backend realtime wire contract
 * (backend: `src/realtime/constants`). Keep these names in lockstep with the
 * server — they are the single source of truth for what the socket speaks, and
 * a rename on one side that is not mirrored on the other fails silently: the
 * listener simply never fires.
 */

/** Server → client event names. */
export const ServerEvent = {
	/** Presence roster changed. */
	PRESENCE_UPDATE: 'presence:update',
	/** Someone started/stopped typing in a room. */
	TYPING: 'activity:typing',
	/** Someone is viewing a resource. */
	VIEWING: 'activity:viewing',
	/** A user-directed notification. Scoped to `user:<id>`. */
	NOTIFICATION: 'notification',
	/** Something in a channel changed; payload is app-defined. */
	CHANNEL_UPDATE: 'channel:update'
} as const;

/** Client → server event names. */
export const ClientEvent = {
	JOIN_ROOM: 'room:join',
	LEAVE_ROOM: 'room:leave',
	TYPING: 'activity:typing',
	VIEWING: 'activity:viewing'
} as const;

/** Firehose room — members see every broadcast on the default channel. */
export const FEED_ROOM = 'feed';
/** Room scoped to a single resource. */
export const channelRoom = (channelId: string) => `channel:${channelId}`;
