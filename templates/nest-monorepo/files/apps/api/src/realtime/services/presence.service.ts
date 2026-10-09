import { Injectable } from '@nestjs/common';
import { CacheService } from 'common/services';
import { PRESENCE_KEY, presenceCountKey } from '../constants';

/**
 * Tracks which users are online across all backend replicas.
 *
 * A user can hold several sockets at once (multiple tabs / devices), so we keep
 * a per-user connection counter in Redis and only flip presence when it crosses
 * the 0↔1 boundary. State lives in Redis (not memory) so it is correct behind
 * the horizontally-scaled Socket.io adapter.
 */
@Injectable()
export class PresenceService {
	constructor(private readonly cache: CacheService) {}

	private get redis() {
		return this.cache.db;
	}

	/**
	 * Record a new socket for a user. Returns `true` if this was their first
	 * connection (i.e. they just came online), so the caller can broadcast it.
	 */
	async connect(userId: string): Promise<boolean> {
		const count = await this.redis.incr(presenceCountKey(userId));
		if (count === 1) {
			await this.redis.sadd(PRESENCE_KEY, userId);
			return true;
		}
		return false;
	}

	/**
	 * Record a socket closing for a user. Returns `true` if that was their last
	 * connection (i.e. they just went offline).
	 */
	async disconnect(userId: string): Promise<boolean> {
		const count = await this.redis.decr(presenceCountKey(userId));
		if (count <= 0) {
			await this.redis.del(presenceCountKey(userId));
			await this.redis.srem(PRESENCE_KEY, userId);
			return true;
		}
		return false;
	}

	/** Ids of every currently-online user. */
	async online(): Promise<string[]> {
		return this.redis.smembers(PRESENCE_KEY);
	}

	async isOnline(userId: string): Promise<boolean> {
		return (await this.redis.sismember(PRESENCE_KEY, userId)) === 1;
	}
}
