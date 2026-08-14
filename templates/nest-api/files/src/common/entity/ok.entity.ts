import { ApiProperty } from '@nestjs/swagger';

export class OKEntity {
	@ApiProperty({ example: 200 })
	status: number;

	@ApiProperty({ example: 'ok' })
	message: string;

	constructor() {
		this.status = 200;
		this.message = 'ok';
	}
}
