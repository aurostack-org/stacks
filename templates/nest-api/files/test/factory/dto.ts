import { Factory } from 'fishery';
import {
	plainToInstance,
	ClassConstructor,
	ClassTransformOptions
} from 'class-transformer';
import { validate as dtoValidate } from 'class-validator';
import { CommonFiltersDto } from 'common/dto';
import { UserFiltersDto } from 'users/dto';

export class Dto {
	static async parse<T extends object, V>(
		cls: ClassConstructor<T>,
		plain: V,
		options?: ClassTransformOptions
	) {
		const dto = plainToInstance(cls, plain, options);
		return await dtoValidate(dto);
	}

	static get commonFilters() {
		return Factory.define<CommonFiltersDto>(() => ({}));
	}

	static get userFilters() {
		return Factory.define<UserFiltersDto>(() => ({
			page: 1,
			limit: 10
		}));
	}
}
