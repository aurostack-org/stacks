import {
	ValidatorConstraint,
	ValidatorConstraintInterface,
	Validate,
	ValidationArguments
} from 'class-validator';
import { Injectable, applyDecorators } from '@nestjs/common';
import { PrismaModelName, CustomValidationArguments } from 'common/types';
import { PrismaService } from '../services';

/**
 * Validate the uniqueness of a field in a given Prisma model.
 * @param {PrismaModelName} model - name of the Prisma model that you want to check for uniqueness.
 * @param {string} [field] - an optional parameter that represents the name of
 * the field in the model that you want to check for uniqueness. If this is not provided, the name of the property being validated will be used.
 */
export function IsUnique(model: PrismaModelName, field?: string) {
	return applyDecorators(Validate(UniqueValidator, [model, field]));
}

/**
 * Check if property value already exists
 */
@ValidatorConstraint({
	name: 'unique',
	async: true
})
@Injectable()
export class UniqueValidator implements ValidatorConstraintInterface {
	constructor(private readonly db: PrismaService) {}

	/**
	 * Method to validate provided condition
	 * @param value - value to validate
	 * @param args - validation arguments
	 */
	async validate(
		value: string,
		args: CustomValidationArguments
	): Promise<boolean> {
		const [model, field] = args.constraints;
		if (!value) return true;
		const exists = await (this.db.x[model] as any).exists({
			[field || args.property]: { equals: args.value, mode: 'insensitive' }
		});
		return !exists;
	}

	/**
	 * default message
	 * @param args - validation arguments
	 */
	defaultMessage(args: ValidationArguments) {
		return `${args.property} '${args.value}' already exists`;
	}
}
