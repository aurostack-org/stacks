import { type ReactNode, useEffect } from 'react';
import { Outlet } from 'react-router';
import { useAuth } from './hooks';
import { redirectToLogin } from './redirect';

type GuardProps = {
	children?: ReactNode;
	/**
	 * Shown while the session is resolving or a redirect is in flight.
	 *
	 * Required on purpose. This used to default to `null`, which meant the app
	 * rendered *nothing* for the entire cross-origin session round trip — ~880 ms
	 * measured against the deployed API, and worse on mobile. Pass the shell
	 * skeleton so the frame is on screen while the session resolves; there is no
	 * correct case for gating a whole app behind a blank screen.
	 */
	fallback: ReactNode;
};

/** Requires any authenticated session; otherwise redirects to the Auth app. */
export function ProtectedRoute({ children, fallback }: GuardProps) {
	const { status } = useAuth();

	useEffect(() => {
		if (status === 'unauthenticated') redirectToLogin();
	}, [status]);

	if (status !== 'authenticated') return <>{fallback}</>;
	return <>{children ?? <Outlet />}</>;
}

type RoleRouteProps = GuardProps & {
	/** Roles allowed to view (any match). Compared against session.user.role. */
	allow: string[];
	/** Rendered when authenticated but lacking a required role (403). Required for
	 *  the same reason as `fallback` — a silent blank 403 looks like a broken app. */
	forbidden: ReactNode;
};

/**
 * Requires an authenticated session AND one of `allow` roles.
 * 401 (no session) -> redirect to Auth; 403 (wrong role) -> forbidden UI.
 */
export function RoleRoute({ allow, children, fallback, forbidden }: RoleRouteProps) {
	const { status, user } = useAuth();

	useEffect(() => {
		if (status === 'unauthenticated') redirectToLogin();
	}, [status]);

	if (status !== 'authenticated') return <>{fallback}</>;

	const roles = (user?.role ?? '')
		.split(',')
		.map((role) => role.trim())
		.filter(Boolean);
	const permitted = allow.some((role) => roles.includes(role));
	if (!permitted) return <>{forbidden}</>;

	return <>{children ?? <Outlet />}</>;
}
