import { ApiProperty } from '@nestjs/swagger';
import { faker as F } from '@faker-js/faker';

export class FileEntity {
	@ApiProperty({ example: F.image.avatar() })
	path: string;

	constructor(file: string) {
		this.path = file;
	}
}
