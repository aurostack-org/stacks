import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { ProtectedRoute, signOut, useAuth } from '@acme/auth';
import { AppShell, AppShellSkeleton, ErrorBoundary, NotFound, RouteFallback } from '@acme/layouts';
import { NAV_ITEMS } from './nav';
import { HomeRoute } from '../routes/home';

/**
 * Feature routes are lazy so the initial bundle stays the shell plus one page.
 * Add a route here and a matching entry in `nav.tsx`.
 */
const SettingsRoute = lazy(() => import('../routes/settings').then((m) => ({ default: m.SettingsRoute })));

const lazyRoute = (element: ReactNode) => <Suspense fallback={<RouteFallback />}>{element}</Suspense>;

/**
 * The shell reads the session itself rather than taking it as a prop —
 * `ProtectedRoute` has already established the user is authenticated by the
 * time this renders.
 *
 * `ErrorBoundary` wraps the shell rather than being passed as the route's
 * `errorElement`: it is a plain React error boundary taking `children`, so it
 * catches render errors anywhere below, including inside a lazy chunk.
 */
function Shell() {
	const { user } = useAuth();
	return (
		<ErrorBoundary>
			<AppShell nav={NAV_ITEMS} user={user ?? {}} onSignOut={() => void signOut()} />
		</ErrorBoundary>
	);
}

export const router = createBrowserRouter([
	{
		// `fallback` is required and must not be blank: the session round trip is
		// cross-origin and takes most of a second, and rendering nothing for that
		// long reads as a broken app.
		element: (
			<ProtectedRoute fallback={<AppShellSkeleton />}>
				<Shell />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <HomeRoute /> },
			{ path: 'settings', element: lazyRoute(<SettingsRoute />) }
		]
	},
	{ path: '*', element: <NotFound /> }
]);
