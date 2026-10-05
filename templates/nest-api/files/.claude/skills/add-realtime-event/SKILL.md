---
name: add-realtime-event
description: Add a Socket.IO event to this API — pushing a change to connected clients (a user, a room, a channel, everyone) or handling a message from them, with the right rooms and permissions. Use when asked to "push X live", "update the UI in real time", "notify connected users", "add a socket event", or for presence, typing indicators and live counters.
---

# Add a realtime event

`src/realtime/` holds the gateway (`gateways/events.gateway.ts`), the emitter
(`services/realtime.service.ts`), presence, and the names everything shares
(`constants/index.ts`).

## Server → client (the common case)

1. **Name the event** in `ServerEvent` in `constants/index.ts`. The frontend
   keeps the same list (`realtime-events.ts`); change both together, or the
   client never hears it.
2. **Emit** from the service where the change happens, after it is committed:

   ```ts
   constructor(private readonly realtime: RealtimeService) {}

   this.realtime.emitToRoom(channelRoom(thing.channelId), ServerEvent.ThingUpdated, ThingEntity.parse(thing));
   ```

   - `notifyUser(userId, payload)` for one user's sockets,
     `emitToChannel`, `emitToFeed`, `emitToRoom(room, event, payload)`,
     `broadcast(event, payload)` for everyone.
   - **Parse the payload through its entity** (`ThingEntity.parse(...)`):
     sockets bypass the HTTP serializer, so this is what keeps the event the
     same shape as the REST response.
   - Emitting never throws and is a no-op before the gateway starts, so it
     cannot fail the request that triggered it.
   - Emit the minimum the client needs to update its cache, or just an id
     and let it refetch.

## Client → server

1. Name it in `ClientEvent`.
2. Handle it in `events.gateway.ts` with `@SubscribeMessage(ClientEvent.X)`.
   The HTTP `AuthGuard` does not run for sockets: the gateway's
   `WsAuthGuard` authenticates, and every handler needs `@WsPermissions({...})`
   for what it allows.
3. Validate the payload with a Zod schema before using it.

## Rooms

New room kinds get a helper beside `userRoom` / `channelRoom`. **Never pass a
client-supplied room string to `socket.join`**: widen `isJoinableRoom` to
allow exactly the new pattern, and check the user may join that specific room.

Check it by connecting a client (the frontend, or a socket.io client script)
and watching the event arrive.
