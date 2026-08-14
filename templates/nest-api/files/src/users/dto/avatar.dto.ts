import { IsString } from 'class-validator';
import { ApiBinaryProperty } from 'common/decorators';

export class AvatarDto {
	@ApiBinaryProperty()
	@IsString()
	file!: string;
}
