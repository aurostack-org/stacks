import { z } from 'zod';
import { NotificationType } from '@db/client';
import { dateTime } from 'common/schemas';
import { paginated } from 'common/entity';

export const NotificationEntity = z
	.object({
		id: z.string(),
		userId: z.string(),
		type: z.enum(NotificationType).meta({ example: 'reply' }),
		// Free-form JSON, as stored; typed to accept Prisma's JsonValue.
		data: z.unknown().meta({
			type: 'object',
			description:
				'Type-specific payload for deep-linking, e.g. { postId, commentId, target }',
			example: { postId: 'ckp...', commentId: 'ckq...' }
		}),
		readAt: dateTime().nullable(),
		createdAt: dateTime()
	})
	.meta({ id: 'NotificationEntity' });
/** What a service hands back; the schema turns it into the response. */
export type NotificationEntity = z.input<typeof NotificationEntity>;

export const PaginatedNotificationEntity = paginated(
	NotificationEntity,
	'PaginatedNotificationEntity'
);
export type PaginatedNotificationEntity = z.input<
	typeof PaginatedNotificationEntity
>;

/** Lightweight badge payload for the unread counter. */
export const UnreadCountEntity = z
	.object({ count: z.number().meta({ example: 3 }) })
	.meta({ id: 'UnreadCountEntity' });
export type UnreadCountEntity = z.input<typeof UnreadCountEntity>;
