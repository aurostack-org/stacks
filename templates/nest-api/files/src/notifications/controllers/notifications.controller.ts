import {
	Controller,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Query
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { IdParam, Op, Returns } from 'common/decorators';
import { OKEntity } from 'common/entity';
import { NotificationsService } from '../services';
import {
	NotificationEntity,
	PaginatedNotificationEntity,
	UnreadCountEntity
} from '../entity';
import { NotificationFilters } from '../dto';

@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
	constructor(private readonly notifications: NotificationsService) {}

	@Get()
	@Op('listNotifications', '/v1/notifications', 'List your notifications')
	@Returns(PaginatedNotificationEntity)
	list(
		@Session() { user }: UserSession,
		@Query({ schema: NotificationFilters }) filters: NotificationFilters
	) {
		return this.notifications.list(user.id, filters);
	}

	@Get('unread-count')
	@Op(
		'getUnreadNotificationCount',
		'/v1/notifications/unread-count',
		'Count your unread notifications'
	)
	@Returns(UnreadCountEntity)
	unreadCount(@Session() { user }: UserSession) {
		return this.notifications.unreadCount(user.id);
	}

	@Patch(':id/read')
	@Op(
		'markNotificationRead',
		'/v1/notifications/:id/read',
		'Mark a single notification as read'
	)
	@IdParam()
	@Returns(NotificationEntity)
	@ApiNotFoundResponse({ description: 'Notification not found' })
	markRead(@Session() { user }: UserSession, @Param('id') id: string) {
		return this.notifications.markRead(user.id, id);
	}

	@Post('read-all')
	@Op(
		'markAllNotificationsRead',
		'/v1/notifications/read-all',
		'Mark all your notifications as read'
	)
	@HttpCode(200)
	@Returns(OKEntity)
	markAllRead(@Session() { user }: UserSession) {
		return this.notifications.markAllRead(user.id);
	}
}
