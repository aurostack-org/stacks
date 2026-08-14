import { AUTH_RATE_LIMIT_MAX_WINDOW } from 'lib/rate-limit';
import { CacheService } from './cache.service';

/** What better-auth's rate limiter persists per (ip, path) bucket. */
interface AuthRateLimitEntry {
	key: string;
	count: number;
	lastRequest: number;
}

const PREFIX = 'auth:rl';

/**
 * Redis-backed storage for better-auth's `/auth/*` rate limiter.
 *
 * Passed as `rateLimit.customStorage` rather than `secondaryStorage`: the latter
 * is also consumed by better-auth's internal adapter for **session** persistence,
 * so setting it would silently relocate sessions out of Postgres. `customStorage`
 * is rate-limit-scoped and takes precedence over `rateLimit.storage`.
 *
 * Unlike the `secondary-storage` code path, better-auth hands `customStorage`
 * plain objects and expects objects back — the JSON round-trip is ours to do.
 */
export const createAuthRateLimitStorage = (cache: CacheService) => ({
	get: async (key: string): Promise<AuthRateLimitEntry | null> => {
		const raw = await cache.db.get(`${PREFIX}:${key}`);
		if (!raw) return null;

		try {
			return JSON.parse(raw) as AuthRateLimitEntry;
		} catch {
			// A corrupt entry must not lock anyone out; treat it as a fresh window.
			return null;
		}
	},

	set: async (key: string, value: AuthRateLimitEntry): Promise<void> => {
		await cache.db.setex(
			`${PREFIX}:${key}`,
			AUTH_RATE_LIMIT_MAX_WINDOW,
			JSON.stringify(value)
		);
	}
});
