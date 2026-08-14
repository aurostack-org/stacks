import { validateSync } from 'class-validator';
import {
	ApiSortProperty,
	IsAllowedSortKeys
} from 'common/validators/sort.validator';

describe('Sort validators', () => {
	describe('IsAllowedSortKeys', () => {
		class SortDto {
			@IsAllowedSortKeys(['name', 'createdAt'])
			order?: string;
		}

		it('should allow allowed keys (with direction and commas)', () => {
			const dto = new SortDto();
			dto.order = 'name,-createdAt';
			const errors = validateSync(dto);
			expect(errors).toHaveLength(0);
		});

		it('should reject unknown keys', () => {
			const dto = new SortDto();
			dto.order = 'invalid';
			const errors = validateSync(dto);
			expect(errors[0].constraints).toBeDefined();
		});
	});

	describe('ApiSortProperty', () => {
		it('should combine ApiPropertyOptional, ValidateOptional and IsAllowedSortKeys', () => {
			class SortDto {
				@ApiSortProperty(['name'])
				order?: string;
			}

			const dto = new SortDto();
			dto.order = 'name';
			const errors = validateSync(dto);
			expect(errors).toHaveLength(0);
		});
	});
});
