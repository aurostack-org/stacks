import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { ValidateOptional } from 'common/validators';
import { CommonFiltersDto } from 'common/dto';

export class NotificationFiltersDto extends CommonFiltersDto {
	@ApiPropertyOptional({
		description: 'Return only unread notifications',
		example: true
	})
	@ValidateOptional()
	// Query strings arrive as text; coerce the usual truthy spellings.
	@Transform(({ value }) => value === true || value === 'true' || value === '1')
	@IsBoolean()
	unread?: boolean;
}
