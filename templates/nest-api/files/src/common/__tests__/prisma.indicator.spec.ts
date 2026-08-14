import { TestBed, type Mocked } from '@suites/unit';
import { HealthCheckError } from '@nestjs/terminus';
import { PrismaHealthIndicator } from 'common/misc/prisma.indicator';
import { PrismaService } from 'common/services';

describe('PrismaHealthIndicator', () => {
	let indicator: PrismaHealthIndicator;
	let db: Mocked<PrismaService>;

	beforeAll(async () => {
		const { unit, unitRef } = await TestBed.solitary(
			PrismaHealthIndicator
		).compile();
		indicator = unit;
		db = unitRef.get(PrismaService);
	});

	it('should be defined', () => {
		expect(indicator).toBeDefined();
	});

	it('should return healthy status when query succeeds', async () => {
		db.$queryRawUnsafe.mockResolvedValue(1);

		const result = await indicator.isHealthy('database');
		expect(db.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
		expect(result).toBeDefined();
		expect(result).toEqual({ database: { status: 'up' } });
	});

	it('should throw HealthCheckError when query fails', async () => {
		db.$queryRawUnsafe.mockRejectedValue(new Error('fail'));

		await expect(indicator.isHealthy('database')).rejects.toBeInstanceOf(
			HealthCheckError
		);
	});
});
