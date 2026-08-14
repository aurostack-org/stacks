import { Injectable } from '@nestjs/common';
import {
	HealthCheckError,
	HealthIndicator,
	HealthIndicatorResult
} from '@nestjs/terminus';
import { PrismaService } from 'common/services';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
	constructor(private readonly db: PrismaService) {
		super();
	}

	async isHealthy(key: string): Promise<HealthIndicatorResult> {
		try {
			await this.db.$queryRawUnsafe('SELECT 1');
			return this.getStatus(key, true);
		} catch (e) {
			throw new HealthCheckError('Database check failed', e);
		}
	}
}
