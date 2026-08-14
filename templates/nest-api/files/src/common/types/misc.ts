import { ValidationArguments } from 'class-validator';
import { PrismaModelName } from './prisma';

export interface PaginationOptions {
	page?: number;
	limit?: number;
}

export interface PaginationInfo {
	skip: number;
	take: number;
	page: number;
}

export interface CustomValidationArguments extends ValidationArguments {
	constraints: [PrismaModelName, string | undefined];
}

export interface SortNesting {
	key: string;
	values: string[];
}

export interface SortObjectArg {
	sort?: string;
	nesting?: SortNesting[];
}
