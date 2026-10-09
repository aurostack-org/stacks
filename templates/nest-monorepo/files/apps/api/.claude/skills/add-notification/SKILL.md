---
name: add-notification
description: Add a new kind of in-app notification to this API — the NotificationType, its data shape, and dispatching it from the action that causes it. Use when asked to "notify the user when X", "add a notification for Y", or to fill the notification inbox and unread badge.
---

# Add a notification type

`src/notifications/` stores notifications, serves the inbox and unread count,
<!-- @feature:start realtime -->
and pushes each new one to the user's connected sockets.
<!-- @feature:end -->
<!-- @feature:start !realtime -->
and serves them to the client to fetch (without `realtime` nothing is pushed:
add it with `stack add realtime` if the inbox should update live).
<!-- @feature:end -->

1. **The type**: add a value to `NotificationType` in
   `packages/db/prisma/schema/enum.prisma`, then `yarn db:migrate` (a migration that
   alters the enum). Add it in the same change as its producer: a type
   nothing dispatches is dead weight in every client.
2. **The data**: `data` is JSON. Decide its shape (ids and the few fields the
   inbox shows, not whole entities) and write it down as a Zod schema or type
   beside the producer, so the frontend can render it.
3. **Dispatch** from the service where the event happens, after it commits:

   ```ts
   constructor(private readonly notifications: NotificationsService) {}

   await this.notifications.dispatch(review.contributorId, NotificationType.REVIEW_FINISHED, {
   	quoteId: review.quoteId,
   	decision: review.status
   });
   ```

   `dispatch` never throws: a failed notification is logged and must not fail
   the action that caused it.
4. **The client** renders the new type in its inbox; tell the frontend the
   type and data shape (and run `yarn gen` there).
