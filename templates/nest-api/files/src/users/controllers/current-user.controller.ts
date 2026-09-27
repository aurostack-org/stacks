import {
	BadRequestException, // @feature media
	Controller,
	Get,
	HttpCode,
	Post,
	UploadedFile, // @feature media
	UseInterceptors // @feature media
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiBadRequestResponse, ApiBody } from '@nestjs/swagger'; // @feature media
import { FileInterceptor } from '@nestjs/platform-express'; // @feature media
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { Op, Returns } from 'common/decorators';
import { MultipartFormData } from 'common/decorators'; // @feature media
import { FileEntity } from 'media/entity'; // @feature media
import { CurrentUserService } from '../services';
import { CurrentUserEntity, toCurrentUser } from '../entity';
import { AVATAR_UPLOAD_SCHEMA } from '../dto'; // @feature media

@ApiTags('Current User')
@Controller({ path: 'user', version: '1' })
export class CurrentUserController {
	constructor(private service: CurrentUserService) {}

	@Get()
	@Op('user', '/v1/user', 'Get current user')
	@Returns(CurrentUserEntity, { description: 'The current user' })
	getCurrentUser(@Session() { user }: UserSession) {
		return toCurrentUser(user);
	}

	@Post('onboarding')
	@Op(
		'completeOnboarding',
		'/v1/user/onboarding',
		"Mark the current user's onboarding as complete"
	)
	@HttpCode(200)
	@Returns(CurrentUserEntity, { description: 'The updated user' })
	completeOnboarding(@Session() { user }: UserSession) {
		return this.service.completeOnboarding(user);
	}

	// @feature:start media
	@Post('avatar')
	@Op(
		'avatar',
		'/v1/user/avatar',
		'Upload a new avatar image for the current user'
	)
	@MultipartFormData()
	@ApiBody({ schema: AVATAR_UPLOAD_SCHEMA })
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
			fileFilter: (req, file, cb) => {
				if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
					return cb(
						new BadRequestException(
							'Only image files (jpg, jpeg, png, gif) are allowed for avatars'
						),
						false
					);
				}
				cb(null, true);
			}
		})
	)
	@HttpCode(200)
	@Returns(FileEntity, { description: 'The uploaded avatar file entity' })
	@ApiBadRequestResponse({
		description: 'Invalid file upload (e.g., wrong format, file too large)'
	})
	updateAvatar(
		@Session() { user }: UserSession,
		@UploadedFile() file: Express.Multer.File
	) {
		return this.service.updateAvatar(user, file);
	}
	// @feature:end
}
