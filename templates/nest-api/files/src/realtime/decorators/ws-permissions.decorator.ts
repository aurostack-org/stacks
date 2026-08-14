import { SetMetadata } from '@nestjs/common';
import { Permission } from 'lib/access';

export const WS_PERMISSIONS_KEY = 'ws:permissions';

/**
 * Require a permission on a `@SubscribeMessage` handler, mirroring what
 * `@UserHasPermission` does for HTTP routes. Enforced by `WsPermissionsGuard`.
 *
 * Websocket handlers never pass through the global HTTP `AuthGuard`, so without
 * this they are gated on identity alone.
 */
export const WsPermissions = (permission: Permission) =>
	SetMetadata(WS_PERMISSIONS_KEY, permission);
