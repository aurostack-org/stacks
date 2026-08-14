import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsString, Min, MinLength } from 'class-validator';
import { faker as F } from '@faker-js/faker';
import { ValidateOptional } from '../validators';

export class CommonFiltersDto {
	@ApiPropertyOptional({ example: F.lorem.word() })
	@ValidateOptional()
	@IsString()
	@MinLength(3)
	search?: string;

	@ApiPropertyOptional()
	@ValidateOptional()
	@Transform(({ value }) => Number.parseInt(value))
	@Min(1)
	limit?: number;

	@ApiPropertyOptional()
	@ValidateOptional()
	@Transform(({ value }) => Number.parseInt(value))
	@Min(1)
	page?: number;
}

export class DateFiltersDto {
	@ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
	@ValidateOptional()
	@IsDateString()
	from?: string;

	@ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
	@ValidateOptional()
	@IsDateString()
	to?: string;
}
