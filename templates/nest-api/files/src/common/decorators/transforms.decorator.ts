import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Prisma } from '@db/client';

export function ToCase(casing: 'lower' | 'upper') {
	return applyDecorators(
		Transform(({ value }) => {
			if (!value) return value;
			if (casing === 'lower') return value.toLowerCase();
			return value.toUpperCase();
		})
	);
}

export function ToNumber() {
	return applyDecorators(
		Transform(({ value }) => {
			if (!value || isNaN(value)) return value;
			if (value instanceof Prisma.Decimal)
				return value.toDecimalPlaces(4).toNumber();
			return new Prisma.Decimal(value).toDecimalPlaces(4).toNumber();
		})
	);
}

export function ToBoolean() {
	return applyDecorators(
		Transform(({ value }) => {
			if (!value) return value;
			return value === 'true' || value === true;
		})
	);
}

export function ToArray() {
	return applyDecorators(
		Transform(({ value }) => {
			if (!value) return value;
			if (Array.isArray(value)) return value;
			return [value];
		})
	);
}

export function ToDecimalString() {
	return applyDecorators(
		Transform(({ value }: { value: Prisma.Decimal | null | undefined }) =>
			value == null ? value : value.toString()
		)
	);
}
