// @/shared/api — shared Redux store + RTK Query base + Socket.IO client.
export { baseApi } from './base-api';
export { baseQueryWithReauth } from './base-query';
export { uploadBaseQuery } from './upload-query';
export type { UploadArgs } from './upload-query';
export { configureApi, getApiBaseUrl, notifyUnauthorized } from './config';
export { makeStore } from './store';
export type { AppStore } from './store';
// @feature:start realtime
export { connectSocket, getSocket, disconnectSocket, joinRoom, leaveRoom } from './socket';
export { ServerEvent, ClientEvent, FEED_ROOM, channelRoom } from './realtime-events';
// @feature:end

// Convenience re-exports so apps get their Redux bindings from one place.
export { Provider, useDispatch, useSelector, useStore } from 'react-redux';
