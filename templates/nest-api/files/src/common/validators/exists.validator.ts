import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	Validate
} from 'class-validator';
import { Injectable, applyDecorators } from '@nestjs/common';
import { PrismaModelName, CustomValidationArguments } from '../types';
import { PrismaService } from '../services';

/**
 * Validate the existence of a field in a given Prisma model.
 * @param {PrismaModelName} model - name of the Prisma model that you want to check for existence.
 * @param {string} [field] - an optional parameter that represents the name of
 * the field in the model that you want to check for existence. If this is not provided, the name of the property being validated will be used.
 */
export function IsExists(model: PrismaModelName, field?: string) {
	return applyDecorators(Validate(ExistsValidator, [model, field]));
}

export function IsEachExists(model: PrismaModelName, field?: string) {
	return applyDecorators(Validate(ExistsArrayValidator, [model, field]));
}

/**
 * Check if property's value exists in database
 */
@ValidatorConstraint({
	name: 'exists',
	async: true
})
@Injectable()
export class ExistsValidator implements ValidatorConstraintInterface {
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
		return exists;
	}

	/**
	 * default message
	 * @param args - validation arguments
	 */
	defaultMessage(args: ValidationArguments) {
		return `${args.property} '${args.value}' does not exist`;
	}
}

/**
 * Check if property's value exists in database
 */
@ValidatorConstraint({
	name: 'exists-list',
	async: true
})
@Injectable()
export class ExistsArrayValidator implements ValidatorConstraintInterface {
	private nonExistentValue = '';

	constructor(private readonly db: PrismaService) {}

	/**
	 * Method to validate provided condition
	 * @param values - values to validate
	 * @param args - validation arguments
	 */
	async validate(
		values: string | string[] | undefined,
		args: CustomValidationArguments
	): Promise<boolean> {
		const [model, field] = args.constraints;
		if (!values) return true;

		for (const value of values) {
			const exists = await (this.db.x[model] as any).exists({
				[field || args.property]: { equals: value, mode: 'insensitive' }
			});
			if (!exists) {
				this.nonExistentValue = value;
				return false;
			}
		}
		return true;
	}

	/**
	 * default message
	 * @param args - validation arguments
	 */
	defaultMessage(args: ValidationArguments) {
		return `${args.property} element with id '${this.nonExistentValue}' does not exist`;
	}
}
