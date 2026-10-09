import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
	GrowthBookClient,
	UserScopedGrowthBook,
	type Attributes,
	type FeatureResult
} from '@growthbook/growthbook';
import { CustomConfigService } from './config.service';
import { LoggerService } from './logger.service';

const POLL_INTERVAL_MS = 60_000;

/**
 * Declare each flag here so `isOn`/`getValue` are typed against real keys
 * instead of arbitrary strings — a renamed flag then fails to compile rather
 * than silently evaluating to its default forever.
 */
export interface AppFeatures extends Record<string, unknown> {
	example: boolean;
}

@Injectable()
export class FeatureFlagService implements OnModuleInit, OnModuleDestroy {
	private readonly client: GrowthBookClient<AppFeatures>;

	constructor(
		private readonly config: CustomConfigService,
		private readonly logger: LoggerService
	) {
		const { apiHost, clientKey } = this.config.growthbook;
		this.client = new GrowthBookClient<AppFeatures>({
			apiHost,
			clientKey,
			enabled: true
		});
	}

	async onModuleInit() {
		try {
			const { success, error } = await this.client.init({ timeout: 2000 });
			if (success) {
				this.logger.info('GrowthBook initialized');
			} else {
				this.logger.warn(
					{ err: error },
					'GrowthBook init did not load features — using defaults'
				);
			}
		} catch (err) {
			this.logger.error(
				{ err },
				'GrowthBook init failed — feature flags will use defaults'
			);
		}
	}

	onModuleDestroy() {
		this.client.destroy();
	}

	/**
	 * Poll GrowthBook for updated feature definitions.
	 * Used instead of SSE streaming
	 */
	@Interval('growthbook-refresh', POLL_INTERVAL_MS)
	async poll() {
		try {
			await this.client.refreshFeatures({ skipCache: true });
		} catch (err) {
			this.logger.warn(
				{ err },
				'GrowthBook poll refresh failed — keeping last known flags'
			);
		}
	}

	/**
	 * Bind a set of user attributes (e.g. from the session) to a scoped
	 * instance. Prefer this when evaluating several flags for the same user.
	 */
	forUser(attributes: Attributes): UserScopedGrowthBook<AppFeatures> {
		return this.client.createScopedInstance({ attributes });
	}

	async refresh() {
		await this.client.refreshFeatures();
	}

	isOn<K extends string & keyof AppFeatures = string>(
		key: K,
		attributes: Attributes = {}
	): boolean {
		return this.client.isOn(key, { attributes });
	}

	isOff<K extends string & keyof AppFeatures = string>(
		key: K,
		attributes: Attributes = {}
	): boolean {
		return this.client.isOff(key, { attributes });
	}

	getValue<
		V extends AppFeatures[K],
		K extends string & keyof AppFeatures = string
	>(key: K, defaultValue: V, attributes: Attributes = {}) {
		return this.client.getFeatureValue(key, defaultValue, { attributes });
	}

	evalFeature<
		V extends AppFeatures[K],
		K extends string & keyof AppFeatures = string
	>(key: K, attributes: Attributes = {}): FeatureResult<V | null> {
		return this.client.evalFeature(key, { attributes });
	}
}
