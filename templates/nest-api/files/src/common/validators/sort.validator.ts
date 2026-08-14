import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsString,
	Validate,
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface
} from 'class-validator';
import { ValidateOptional } from './misc.validator';

interface CustomSortValidationArguments extends ValidationArguments {
	constraints: [string[]];
}

/**
 * Validate the sort keys.
 * @param keys - sort keys
 */
export function IsAllowedSortKeys(keys: string[]) {
	return applyDecorators(Validate(SortKeyValidator, [keys]));
}

export function ApiSortProperty(keys: string[]) {
	return applyDecorators(
		ApiPropertyOptional({
			example: keys.join(',') // Example: 'name,createdAt'
		}),
		ValidateOptional(),
		IsString(),
		IsAllowedSortKeys(keys)
	);
}

/**
 * Ensures that the keys of the sort object match the specified set of keys.
 */
@ValidatorConstraint({ name: 'sort', async: false })
class SortKeyValidator implements ValidatorConstraintInterface {
	validate(
		value: string | undefined | null,
		args: CustomSortValidationArguments
	) {
		if (!value) return true;
		const values = value.split(',').map((v) => v.replace(/^-/, ''));
		const [keys] = args.constraints;
		return values.every((v) => keys.includes(v));
	}

	defaultMessage(args: ValidationArguments) {
		const [keys] = args.constraints;
		return 'Sort key must be one of the following: ' + keys.join(', ');
	}
}
