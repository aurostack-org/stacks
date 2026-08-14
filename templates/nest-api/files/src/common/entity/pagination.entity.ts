import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaEntity {
	@ApiProperty()
	total!: number;

	@ApiProperty()
	pageSize!: number;

	@ApiProperty()
	currentPage!: number;

	@ApiProperty()
	lastPage!: number;

	constructor(data: PaginationMetaEntity) {
		Object.assign(this, data);
	}
}
