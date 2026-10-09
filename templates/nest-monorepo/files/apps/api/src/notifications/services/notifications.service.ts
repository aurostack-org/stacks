import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@acme/db/client';
import { PrismaService, LoggerService } from 'common/services';
import { ok } from 'common/entity';
import { RealtimeService } from 'realtime/services/realtime.service'; // @feature realtime
import {
	NotificationEntity,
	PaginatedNotificationEntity,
	UnreadCountEntity
} from '../entity';
import { NotificationFilters } from '../dto';

@Injectable()
export class NotificationsService {
	constructor(
		private readonly db: PrismaService,
		private readonly realtime: RealtimeService, // @feature realtime
		private readonly logger: LoggerService
	) {}

	/**
	 * Persist a notification, then push it to the recipient's live sockets.
	 *
	 * This is the write side other modules call: storing first
	 * means the alert survives an offline recipient — the socket emit is just the
	 * real-time bonus for anyone currently connected. Never throws: a notification
	 * failing must not fail the action that triggered it (a comment, a vote), so
	 * errors are swallowed and logged, mirroring `RealtimeService`'s emit policy.
	 */
	async dispatch(
		userId: string,
		type: NotificationType,
		data: Prisma.InputJsonValue
	): Promise<NotificationEntity | null> {
		try {
			const notification = await this.db.notification.create({
				data: { userId, type, data }
			});
			// @feature:start realtime
			// Sockets bypass the HTTP serializer; encode through the same schema so
			// the event has exactly the shape the REST endpoints return.
			this.realtime.notifyUser(userId, NotificationEntity.parse(notification));
			// @feature:end
			return notification;
		} catch (err) {
			this.logger.warn(
				{ err, userId, type },
				'Failed to dispatch notification.'
			);
			return null;
		}
	}

	async list(
		userId: string,
		filters: NotificationFilters
	): Promise<PaginatedNotificationEntity> {
		const where: Prisma.NotificationWhereInput = { userId };
		if (filters.unread) where.readAt = null;

		const [list, meta] = await this.db.x.notification.paginate({
			where,
			page: filters.page,
			limit: filters.limit,
			orderBy: { createdAt: 'desc' }
		});

		return { list, ...meta };
	}

	async unreadCount(userId: string): Promise<UnreadCountEntity> {
		const count = await this.db.notification.count({
			where: { userId, readAt: null }
		});
		return { count };
	}

	async markRead(userId: string, id: string): Promise<NotificationEntity> {
		const existing = await this.db.notification.findFirst({
			where: { id, userId }
		});
		if (!existing) throw new NotFoundException('Notification not found');

		// Idempotent: re-reading an already-read notification is a no-op.
		if (existing.readAt) return existing;

		return this.db.notification.update({
			where: { id },
			data: { readAt: new Date() }
		});
	}

	async markAllRead(userId: string) {
		await this.db.notification.updateMany({
			where: { userId, readAt: null },
			data: { readAt: new Date() }
		});
		return ok();
	}
}
