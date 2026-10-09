import { z } from 'zod';
import { CommonFilters } from 'common/dto';

export const NotificationFilters = CommonFilters.extend({
	// "true"/"1"/"yes"/"on" and their opposites; anything else is rejected.
	unread: z
		.stringbool()
		.optional()
		.meta({ description: 'Return only unread notifications', example: true })
});
export type NotificationFilters = z.output<typeof NotificationFilters>;
