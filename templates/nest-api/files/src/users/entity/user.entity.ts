import { User } from '@db/client';
import { ApiProperty } from '@nestjs/swagger';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { faker as F } from '@faker-js/faker';
import { DateTimeString, EmailProperty } from 'common/decorators';
import { PaginationMetaEntity } from 'common/entity';

export class UserEntity implements User {
	@ApiProperty()
	id!: string;

	@ApiProperty({ example: F.person.fullName() })
	name!: string;

	@EmailProperty()
	email!: string;

	@ApiProperty()
	emailVerified!: boolean;

	@ApiProperty({ example: F.image.avatar(), type: String, nullable: true })
	image!: string | null;

	@DateTimeString()
	createdAt!: Date;

	@DateTimeString()
	updatedAt!: Date;

	@ApiProperty({ example: 'user', type: String, nullable: true })
	role!: string | null;

	@ApiProperty({ example: false, type: Boolean, nullable: true })
	banned!: boolean | null;

	@ApiProperty({ example: 'Violation of terms', type: String, nullable: true })
	banReason!: string | null;

	@DateTimeString(true)
	banExpires!: Date | null;

	@DateTimeString(true)
	onboardingCompletedAt!: Date | null;

	constructor(data: User) {
		Object.assign(this, data);
	}

	static list(users: User[]) {
		return users.map((user) => new UserEntity(user));
	}
}

export class PaginatedUserEntity extends PaginationMetaEntity {
	@ApiProperty({ type: UserEntity, isArray: true })
	list: UserEntity[];

	constructor({
		currentPage,
		lastPage,
		list,
		pageSize,
		total
	}: Omit<PaginatedUserEntity, 'list'> & { list: User[] }) {
		super({ currentPage, total, lastPage, pageSize });
		this.list = UserEntity.list(list);
	}
}

export class CurrentUserEntity implements Omit<
	User,
	'banned' | 'banReason' | 'banExpires' | 'role'
> {
	@ApiProperty()
	id!: string;

	@ApiProperty({ example: F.person.fullName() })
	name!: string;

	@EmailProperty()
	email!: string;

	@ApiProperty()
	emailVerified!: boolean;

	@ApiProperty({ example: F.image.avatar(), type: String, nullable: true })
	image!: string | null;

	@DateTimeString()
	createdAt!: Date;

	@DateTimeString()
	updatedAt!: Date;

	@ApiProperty({ example: 'user', type: String, nullable: true })
	role!: string | null;

	@DateTimeString(true)
	onboardingCompletedAt!: Date | null;

	constructor(data: UserSession['user']) {
		this.id = data.id;
		this.name = data.name;
		this.email = data.email;
		this.emailVerified = data.emailVerified;
		this.image = data.image || null;
		this.createdAt = data.createdAt;
		this.updatedAt = data.updatedAt;
		this.role = CurrentUserEntity.getRoleFromSession(data);
		// additionalField — not present on the inferred session-user type.
		this.onboardingCompletedAt =
			(data as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt ??
			null;
	}

	private static getRoleFromSession(user: UserSession['user']): string | null {
		if (user.role) {
			if (Array.isArray(user.role)) {
				return user.role[0]; // Assuming the first role is the primary one
			}
			return user.role;
		}
		return null;
	}
}
