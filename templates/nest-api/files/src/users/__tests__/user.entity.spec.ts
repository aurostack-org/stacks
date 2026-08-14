import { Entity } from '@test/factory/entity';
import { Gen } from '@test/factory/gen';
import { UserEntity, PaginatedUserEntity, CurrentUserEntity } from '../entity';

describe('UserEntity', () => {
	describe('constructor', () => {
		it('should assign all User fields to the instance', () => {
			const data = Entity.user.build();
			const entity = new UserEntity(data);

			expect(entity.id).toBe(data.id);
			expect(entity.name).toBe(data.name);
			expect(entity.email).toBe(data.email);
			expect(entity.emailVerified).toBe(data.emailVerified);
			expect(entity.image).toBe(data.image);
			expect(entity.role).toBe(data.role);
			expect(entity.banned).toBe(data.banned);
			expect(entity.banReason).toBe(data.banReason);
			expect(entity.banExpires).toBe(data.banExpires);
			expect(entity.createdAt).toBe(data.createdAt);
			expect(entity.updatedAt).toBe(data.updatedAt);
		});

		it('should handle null image', () => {
			const data = Entity.user.build({ image: null });
			const entity = new UserEntity(data);

			expect(entity.image).toBeNull();
		});

		it('should handle null banned fields', () => {
			const data = Entity.user.build({
				banned: null,
				banReason: null,
				banExpires: null
			});
			const entity = new UserEntity(data);

			expect(entity.banned).toBeNull();
			expect(entity.banReason).toBeNull();
			expect(entity.banExpires).toBeNull();
		});
	});

	describe('list', () => {
		it('should map an array of User objects to UserEntity[]', () => {
			const users = Entity.user.buildList(5);
			const entities = UserEntity.list(users);

			expect(entities).toHaveLength(5);
			entities.forEach((entity, i) => {
				expect(entity).toBeInstanceOf(UserEntity);
				expect(entity.id).toBe(users[i].id);
			});
		});

		it('should return empty array for empty input', () => {
			const entities = UserEntity.list([]);
			expect(entities).toHaveLength(0);
		});

		it('should return single-element array', () => {
			const users = Entity.user.buildList(1);
			const entities = UserEntity.list(users);

			expect(entities).toHaveLength(1);
			expect(entities[0]).toBeInstanceOf(UserEntity);
		});
	});
});

describe('PaginatedUserEntity', () => {
	describe('constructor', () => {
		it('should set pagination meta from constructor args', () => {
			const users = Entity.user.buildList(3);
			const entity = new PaginatedUserEntity({
				list: users,
				total: 10,
				currentPage: 2,
				lastPage: 4,
				pageSize: 3
			});

			expect(entity.total).toBe(10);
			expect(entity.currentPage).toBe(2);
			expect(entity.lastPage).toBe(4);
			expect(entity.pageSize).toBe(3);
		});

		it('should transform list into UserEntity instances', () => {
			const users = Entity.user.buildList(3);
			const entity = new PaginatedUserEntity({
				list: users,
				total: 3,
				currentPage: 1,
				lastPage: 1,
				pageSize: 3
			});

			expect(entity.list).toHaveLength(3);
			entity.list.forEach((item) => {
				expect(item).toBeInstanceOf(UserEntity);
			});
		});

		it('should handle empty list', () => {
			const entity = new PaginatedUserEntity({
				list: [],
				total: 0,
				currentPage: 1,
				lastPage: 1,
				pageSize: 0
			});

			expect(entity.list).toHaveLength(0);
			expect(entity.total).toBe(0);
		});
	});
});

describe('CurrentUserEntity', () => {
	describe('constructor', () => {
		it('should map session user fields to entity', () => {
			const sessionUser = Entity.requestUser.build({
				id: Gen.uuid(),
				name: Gen.fullName(),
				email: Gen.email(),
				emailVerified: true,
				image: 'http://example.com/avatar.png',
				createdAt: new Date(),
				updatedAt: new Date(),
				role: 'admin'
			});
			const entity = new CurrentUserEntity(sessionUser);

			expect(entity.id).toBe(sessionUser.id);
			expect(entity.name).toBe(sessionUser.name);
			expect(entity.email).toBe(sessionUser.email);
			expect(entity.emailVerified).toBe(true);
			expect(entity.image).toBe(sessionUser.image);
			expect(entity.createdAt).toBe(sessionUser.createdAt);
			expect(entity.updatedAt).toBe(sessionUser.updatedAt);
		});

		it('should set image to null when session user image is falsy', () => {
			const sessionUser = Entity.requestUser.build({
				id: Gen.uuid(),
				name: Gen.fullName(),
				email: Gen.email(),
				emailVerified: false,
				image: '',
				createdAt: new Date(),
				updatedAt: new Date(),
				role: 'user'
			});
			const entity = new CurrentUserEntity(sessionUser);
			expect(entity.image).toBeNull();
		});

		it('should set image to null when session user image is undefined', () => {
			const sessionUser = {
				id: Gen.uuid(),
				name: Gen.fullName(),
				email: Gen.email(),
				emailVerified: false,
				image: undefined,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: 'user'
			};

			const entity = new CurrentUserEntity(sessionUser as any);
			expect(entity.image).toBeNull();
		});

		it('should preserve image when session user has a valid image', () => {
			const imageUrl = 'http://example.com/avatar.png';
			const sessionUser = Entity.requestUser.build({
				id: Gen.uuid(),
				name: Gen.fullName(),
				email: Gen.email(),
				emailVerified: true,
				image: imageUrl,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: 'admin'
			});
			const entity = new CurrentUserEntity(sessionUser);
			expect(entity.image).toBe(imageUrl);
		});
	});

	describe('getRoleFromSession (via constructor)', () => {
		it('should extract string role', () => {
			const sessionUser = Entity.requestUser.build({
				id: Gen.uuid(),
				name: Gen.fullName(),
				email: Gen.email(),
				emailVerified: true,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: 'admin'
			});
			const entity = new CurrentUserEntity(sessionUser);
			expect(entity.role).toBe('admin');
		});

		it('should extract first element when role is an array', () => {
			const sessionUser = Entity.requestUser.build({
				id: Gen.uuid(),
				name: Gen.fullName(),
				email: Gen.email(),
				emailVerified: true,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: ['superuser', 'admin']
			});
			const entity = new CurrentUserEntity(sessionUser);
			expect(entity.role).toBe('superuser');
		});

		it('should return null when role is undefined', () => {
			const sessionUser = Entity.requestUser.build({
				id: Gen.uuid(),
				name: Gen.fullName(),
				email: Gen.email(),
				emailVerified: true,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: undefined
			});
			const entity = new CurrentUserEntity(sessionUser);
			expect(entity.role).toBeNull();
		});

		it('should handle single-element array role', () => {
			const sessionUser = Entity.requestUser.build({
				id: Gen.uuid(),
				name: Gen.fullName(),
				email: Gen.email(),
				emailVerified: true,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: ['user']
			});
			const entity = new CurrentUserEntity(sessionUser);
			expect(entity.role).toBe('user');
		});
	});
});
