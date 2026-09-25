import { applyDecorators } from '@nestjs/common';
import {
	ApiProperty,
	ApiHideProperty,
	ApiPropertyOptions,
	ApiPropertyOptional,
	ApiParam,
	ApiOperation,
	ApiOperationOptions
} from '@nestjs/swagger';
import { faker as F } from '@faker-js/faker';
import { IsEmail } from 'class-validator';
import { Transform, Exclude } from 'class-transformer';
import { ValidateOptional } from 'common/validators';
import { ToCase, ToNumber } from './transforms.decorator';

type Optional = { optional?: boolean };

// ApiPropertyOptions is a union; a plain Omit would merge its members.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never;

type PropertyOptions = DistributiveOmit<ApiPropertyOptions, 'example'> &
	Optional;

type BinaryPropertyOptions = DistributiveOmit<
	Exclude<ApiPropertyOptions, { type: 'object' }>,
	'type' | 'format'
> &
	Optional;

export function Hidden() {
	return applyDecorators(ApiHideProperty(), Exclude({ toPlainOnly: true }));
}

export function DateTimeString(nullable = false) {
	if (nullable)
		return applyDecorators(
			ApiProperty({ type: String, nullable: true, example: F.date.recent() }),
			Transform(({ value }) => (value === null ? value : value.toISOString()))
		);
	return applyDecorators(
		ApiProperty({ type: String, example: F.date.recent() }),
		Transform(({ value }) => value.toISOString())
	);
}

export function DateString(nullable = false) {
	const example = F.date.recent().toISOString().slice(0, 10);

	if (nullable)
		return applyDecorators(
			ApiProperty({ type: String, nullable: true, example }),
			Transform(({ value }) =>
				value == null ? value : value.toISOString().slice(0, 10)
			)
		);

	return applyDecorators(
		ApiProperty({ type: String, example }),
		Transform(({ value }) =>
			value == null ? value : value.toISOString().slice(0, 10)
		)
	);
}

export function ApiDecimalProperty(nullable = false) {
	const example = F.number
		.float({ min: 0, max: 10000, multipleOf: 0.01 })
		.toString();

	if (nullable)
		return applyDecorators(
			ApiProperty({
				type: Number,
				nullable: true,
				example
			}),
			ToNumber()
		);

	return applyDecorators(ApiProperty({ type: Number, example }), ToNumber());
}

export function ApiBinaryProperty({
	optional,
	...options
}: BinaryPropertyOptions = {}) {
	if (optional) {
		return applyDecorators(
			ApiPropertyOptional({ type: 'string', format: 'binary', ...options }),
			ValidateOptional()
		);
	}

	return applyDecorators(
		ApiProperty({ type: 'string', format: 'binary', ...options })
	);
}

export function EmailProperty({ optional, ...options }: PropertyOptions = {}) {
	const example = F.internet.email().toLowerCase();

	if (optional) {
		return applyDecorators(
			ApiPropertyOptional({ example, ...options }),
			ValidateOptional(),
			IsEmail(),
			ToCase('lower')
		);
	}

	return applyDecorators(
		ApiProperty({ example, ...options }),
		IsEmail(),
		ToCase('lower')
	);
}

export function IdParam(name = 'id') {
	return applyDecorators(ApiParam({ name, type: String }));
}

type OperationOptions = Omit<
	ApiOperationOptions,
	'summary' | 'description' | 'operationId'
>;
export function Op(
	operationId: string,
	summary: string,
	description: string | undefined = undefined,
	options: OperationOptions = {}
) {
	return applyDecorators(
		ApiOperation({
			summary,
			operationId,
			description,
			...options
		})
	);
}
