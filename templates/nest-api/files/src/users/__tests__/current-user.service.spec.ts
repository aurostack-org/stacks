import { TestBed, type Mocked } from '@suites/unit';
import { Entity } from '@test/factory/entity';
import { PrismaService } from 'common/services';
import { MediaService } from 'media/services';
import { FileEntity } from 'media/entity';
import { CurrentUserService } from '../services';

describe('CurrentUserService', () => {
	let service: CurrentUserService;
	let media: Mocked<MediaService>;
	let db: Mocked<PrismaService>;

	beforeAll(async () => {
		const { unit, unitRef } =
			await TestBed.solitary(CurrentUserService).compile();
		service = unit;
		media = unitRef.get(MediaService);
		db = unitRef.get(PrismaService);
	});

	beforeEach(() => {
		media.uploadAvatar.mockReset();
		media.deleteFile.mockReset();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('updateAvatar', () => {
		const file = {
			originalname: 'avatar.png',
			buffer: Buffer.from('image-data'),
			mimetype: 'image/png'
		} as Express.Multer.File;

		it('should upload the file via MediaService', async () => {
			const user = Entity.user.build({ image: null });
			const newImageUrl = 'http://s3.example.com/avatars/new.png';
			media.uploadAvatar.mockResolvedValue(newImageUrl);
			db.user.update.mockResolvedValue(user);
			await service.updateAvatar(
				Entity.requestUser.build({ id: user.id }),
				file
			);
			expect(media.uploadAvatar).toHaveBeenCalledWith(file);
		});

		it('should update the user record with the new image URL', async () => {
			const user = Entity.user.build({ image: null });
			const newImageUrl = 'http://s3.example.com/avatars/new.png';
			media.uploadAvatar.mockResolvedValue(newImageUrl);
			db.user.update.mockResolvedValue(user);

			await service.updateAvatar(
				Entity.requestUser.build({ id: user.id }),
				file
			);

			expect(db.user.update).toHaveBeenCalledWith({
				where: { id: user.id },
				data: { image: newImageUrl }
			});
		});

		it('should return a FileEntity with the new image path', async () => {
			const user = Entity.user.build({ image: null });
			const newImageUrl = 'http://s3.example.com/avatars/new.png';
			media.uploadAvatar.mockResolvedValue(newImageUrl);
			db.user.update.mockResolvedValue(user);

			const result = await service.updateAvatar(
				Entity.requestUser.build(),
				file
			);

			expect(result).toBeInstanceOf(FileEntity);
			expect(result.path).toBe(newImageUrl);
		});

		it('should delete the old avatar when user already has an image', async () => {
			const oldImageUrl = 'http://s3.example.com/avatars/old.png';
			const user = Entity.user.build({ image: oldImageUrl });
			const newImageUrl = 'http://s3.example.com/avatars/new.png';
			media.uploadAvatar.mockResolvedValue(newImageUrl);
			db.user.update.mockResolvedValue(user);

			await service.updateAvatar(
				Entity.requestUser.build({ id: user.id, image: oldImageUrl }),
				file
			);

			expect(media.deleteFile).toHaveBeenCalledWith(oldImageUrl);
		});

		it('should NOT delete old avatar when user has no existing image', async () => {
			const user = Entity.user.build({ image: null });
			const newImageUrl = 'http://s3.example.com/avatars/new.png';
			media.uploadAvatar.mockResolvedValue(newImageUrl);
			db.user.update.mockResolvedValue(user);

			await service.updateAvatar(
				Entity.requestUser.build({ id: user.id, image: null }),
				file
			);

			expect(media.deleteFile).not.toHaveBeenCalled();
		});

		it('should NOT delete old avatar when user image is empty string', async () => {
			const user = Entity.user.build({ image: '' });
			const newImageUrl = 'http://s3.example.com/avatars/new.png';
			media.uploadAvatar.mockResolvedValue(newImageUrl);
			db.user.update.mockResolvedValue(user);

			await service.updateAvatar(
				Entity.requestUser.build({ id: user.id, image: '' }),
				file
			);

			expect(media.deleteFile).not.toHaveBeenCalled();
		});
	});
});
