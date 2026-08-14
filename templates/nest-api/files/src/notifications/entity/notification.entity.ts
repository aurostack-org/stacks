import { ApiProperty } from '@nestjs/swagger';
import { Notification, NotificationType, Prisma } from '@db/client';
import { DateTimeString } from 'common/decorators';
import { PaginationMetaEntity } from 'common/entity';

export class NotificationEntity {
	@ApiProperty() id!: string;

	@ApiProperty() userId!: string;

	@ApiProperty({
		enum: ['comment', 'reply', 'upvote'],
		example: 'reply'
	})
	type!: NotificationType;

	@ApiProperty({
		type: Object,
		description:
			'Type-specific payload for deep-linking, e.g. { postId, commentId, target }',
		example: { postId: 'ckp...', commentId: 'ckq...' }
	})
	data!: Prisma.JsonValue;

	@DateTimeString(true)
	readAt!: Date | null;

	@DateTimeString()
	createdAt!: Date;

	constructor(notification: Notification) {
		Object.assign(this, notification);
	}

	static list(notifications: Notification[]) {
		return notifications.map((n) => new NotificationEntity(n));
	}
}

export class PaginatedNotificationEntity extends PaginationMetaEntity {
	@ApiProperty({ type: NotificationEntity, isArray: true })
	list: NotificationEntity[];

	constructor({
		currentPage,
		lastPage,
		list,
		pageSize,
		total
	}: Omit<PaginatedNotificationEntity, 'list'> & { list: Notification[] }) {
		super({ currentPage, total, lastPage, pageSize });
		this.list = NotificationEntity.list(list);
	}
}

/** Lightweight badge payload for the unread counter. */
export class UnreadCountEntity {
	@ApiProperty({ example: 3 })
	count!: number;

	constructor(count: number) {
		this.count = count;
	}
}
