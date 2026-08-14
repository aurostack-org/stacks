import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@db/client';
import { PrismaService, LoggerService } from 'common/services';
import { OKEntity } from 'common/entity';
import { RealtimeService } from 'realtime/services/realtime.service';
import {
	NotificationEntity,
	PaginatedNotificationEntity,
	UnreadCountEntity
} from '../entity';
import { NotificationFiltersDto } from '../dto';

@Injectable()
export class NotificationsService {
	constructor(
		private readonly db: PrismaService,
		private readonly realtime: RealtimeService,
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
			const entity = new NotificationEntity(notification);
			this.realtime.notifyUser(userId, entity);
			return entity;
		} catch (err) {
			this.logger.warn(
				{ err, userId, type },
				'Failed to dispatch notification.'
			);
			return null;
		}
	}

	async list(userId: string, filters: NotificationFiltersDto) {
		const where: Prisma.NotificationWhereInput = { userId };
		if (filters.unread) where.readAt = null;

		const [list, meta] = await this.db.x.notification.paginate({
			where,
			page: filters.page,
			limit: filters.limit,
			orderBy: { createdAt: 'desc' }
		});

		return new PaginatedNotificationEntity({ list, ...meta });
	}

	async unreadCount(userId: string) {
		const count = await this.db.notification.count({
			where: { userId, readAt: null }
		});
		return new UnreadCountEntity(count);
	}

	async markRead(userId: string, id: string) {
		const existing = await this.db.notification.findFirst({
			where: { id, userId }
		});
		if (!existing) throw new NotFoundException('Notification not found');

		// Idempotent: re-reading an already-read notification is a no-op.
		if (existing.readAt) return new NotificationEntity(existing);

		const updated = await this.db.notification.update({
			where: { id },
			data: { readAt: new Date() }
		});
		return new NotificationEntity(updated);
	}

	async markAllRead(userId: string) {
		await this.db.notification.updateMany({
			where: { userId, readAt: null },
			data: { readAt: new Date() }
		});
		return new OKEntity();
	}
}
