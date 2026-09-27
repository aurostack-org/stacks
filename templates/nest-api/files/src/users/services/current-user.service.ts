import { Injectable } from '@nestjs/common';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { PrismaService } from 'common/services';
import { MediaService } from 'media/services';
import { FileEntity } from 'media/entity';
import { CurrentUserEntity } from '../entity';

@Injectable()
export class CurrentUserService {
	constructor(
		private media: MediaService,
		private db: PrismaService
	) {}

	async updateAvatar(user: UserSession['user'], file: Express.Multer.File) {
		const image = await this.media.uploadAvatar(file);
		if (user.image) {
			this.media.deleteFile(user.image);
		}
		await this.db.user.update({
			where: { id: user.id },
			data: { image }
		});
		return new FileEntity(image);
	}

	/**
	 * Stamp the user's onboarding as complete (idempotent — re-stamps on repeat).
	 * Called when the wizard finishes or is skipped so the first-run gate stops
	 * redirecting them.
	 */
	async completeOnboarding(user: UserSession['user']) {
		const updated = await this.db.user.update({
			where: { id: user.id },
			data: { onboardingCompletedAt: new Date() }
		});
		return new CurrentUserEntity(updated as unknown as UserSession['user']);
	}
}
