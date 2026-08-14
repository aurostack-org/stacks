import { TestBed, type Mocked } from '@suites/unit';
import {
	HealthCheckService,
	HttpHealthIndicator,
	DiskHealthIndicator,
	MemoryHealthIndicator
} from '@nestjs/terminus';
import { HealthController } from 'common/controllers/health.controller';
import { PrismaHealthIndicator } from 'common/misc/prisma.indicator';
import { CustomConfigService } from 'common/services';

describe('HealthController', () => {
	let controller: HealthController;
	let health: Mocked<HealthCheckService>;
	let http: Mocked<HttpHealthIndicator>;
	let prisma: Mocked<PrismaHealthIndicator>;
	let disk: Mocked<DiskHealthIndicator>;
	let memory: Mocked<MemoryHealthIndicator>;
	let config: Mocked<CustomConfigService>;

	beforeAll(async () => {
		const { unit, unitRef } = await TestBed.solitary(
			HealthController
		).compile();
		controller = unit;
		health = unitRef.get(HealthCheckService);
		http = unitRef.get(HttpHealthIndicator);
		prisma = unitRef.get(PrismaHealthIndicator);
		disk = unitRef.get(DiskHealthIndicator);
		memory = unitRef.get(MemoryHealthIndicator);
		config = unitRef.get(CustomConfigService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('should delegate to HealthCheckService.check with proper indicators', async () => {
		config.app = { host: 'http://localhost:5000' } as any;
		health.check.mockImplementation(async (fns) => {
			for (const fn of fns) {
				await fn();
			}
			return { status: 'ok' } as any;
		});
		http.pingCheck.mockResolvedValue({} as any);
		prisma.isHealthy.mockResolvedValue({} as any);
		memory.checkHeap.mockResolvedValue({} as any);
		memory.checkRSS.mockResolvedValue({} as any);
		disk.checkStorage.mockResolvedValue({} as any);

		const result = await controller.check();

		expect(health.check).toHaveBeenCalled();
		expect(http.pingCheck).toHaveBeenCalledWith('http', config.app.host);
		expect(prisma.isHealthy).toHaveBeenCalledWith('database');
		expect(memory.checkHeap).toHaveBeenCalled();
		expect(memory.checkRSS).toHaveBeenCalled();
		expect(disk.checkStorage).toHaveBeenCalled();
		expect(result).toEqual({ status: 'ok' });
	});
});
