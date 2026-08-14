import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommonFiltersDto } from 'common/dto';
import { IsExists, ValidateOptional } from 'common/validators';

export class UserFiltersDto extends CommonFiltersDto {
	@ApiPropertyOptional()
	@ValidateOptional()
	@IsExists('user', 'role')
	role?: string;
}
