---
name: add-realtime-listener
description: React to a server-sent Socket.IO event in this app — keep the event names in step with the API, connect once for a signed-in user, join rooms, and update the RTK Query cache when the event arrives. Use when asked to "update this live", "show new X without refreshing", "listen for Y", or for presence, typing indicators, live counters and inbox badges.
---

# Listen for a realtime event

The client is `src/shared/api/socket.ts` (`connectSocket`, `getSocket`,
`joinRoom`, `leaveRoom`, `disconnectSocket`); the names are in
`src/shared/api/realtime-events.ts` (`ServerEvent`, `ClientEvent`,
`FEED_ROOM`, `channelRoom`).

1. **Names in lockstep.** Add the event to `ServerEvent` with exactly the
   string the API's `src/realtime/constants/index.ts` uses. A mismatch is
   silent: the handler simply never fires.

2. **Connect once.** If nothing connects yet, connect when a session exists
   and disconnect on sign-out, in one place (a hook used by the signed-in
   shell): `connectSocket(API_URL)` (from `@/lib/env`) on sign-in, `disconnectSocket()` on
   sign-out. It sends the session cookie (`withCredentials`); the API
   authenticates the socket from it.

3. **Join what you listen to.** The user's own room is joined by the server.
   For a shared room, `joinRoom(channelRoom(id))` when the screen mounts and
   `leaveRoom` when it unmounts. The server only admits rooms it allows.

4. **Update the cache, not local state**:

   ```ts
   useEffect(() => {
   	const socket = getSocket();
   	if (!socket) return;
   	const onUpdated = (thing: ThingEntity) => {
   		dispatch(thingsApi.util.updateQueryData('listThings', {}, (draft) => {
   			const i = draft.list.findIndex((t) => t.id === thing.id);
   			if (i >= 0) draft.list[i] = thing;
   		}));
   	};
   	socket.on(ServerEvent.ThingUpdated, onUpdated);
   	return () => void socket.off(ServerEvent.ThingUpdated, onUpdated);
   }, [dispatch]);
   ```

   When patching is awkward, `dispatch(baseApi.util.invalidateTags(['Things']))`
   refetches instead. Always remove the listener on unmount.

5. **Check** with two browser sessions: change the thing in one, watch it
   update in the other.
