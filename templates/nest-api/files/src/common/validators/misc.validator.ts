import { applyDecorators } from '@nestjs/common';
import { ValidateIf } from 'class-validator';

export function ValidateOptional() {
	return applyDecorators(ValidateIf((_, value) => value));
}
