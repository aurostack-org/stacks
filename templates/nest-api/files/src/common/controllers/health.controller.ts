import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import {
	HealthCheckService,
	HttpHealthIndicator,
	HealthCheck,
	DiskHealthIndicator,
	MemoryHealthIndicator
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Op } from 'common/decorators';
import { CustomConfigService } from '../services';
import { PrismaHealthIndicator } from '../misc';

@ApiTags('App')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
// Probed on a fixed interval by orchestrators; throttling it would take the
// service out of rotation under exactly the load it exists to report on.
@SkipThrottle()
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private http: HttpHealthIndicator,
		private config: CustomConfigService,
		private prisma: PrismaHealthIndicator,
		private disk: DiskHealthIndicator,
		private memory: MemoryHealthIndicator
	) {}

	@Get()
	@ApiExcludeEndpoint()
	@Op('health', '/health', 'Check the health of the server')
	@HealthCheck()
	@AllowAnonymous()
	async check() {
		return this.health.check([
			() => this.http.pingCheck('http', this.config.app.host),
			() => this.prisma.isHealthy('database'),
			() => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
			() => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
			() =>
				this.disk.checkStorage('disk_storage', {
					thresholdPercent: 0.8,
					path: '/'
				})
		]);
	}
}
