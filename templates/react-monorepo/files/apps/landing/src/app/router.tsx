import { createBrowserRouter } from 'react-router';
import { ErrorBoundary, MarketingLayout, NotFound } from '@acme/layouts';
import { HomeRoute } from '../routes/home';

/**
 * The landing site is public — no auth guard. `MarketingLayout` takes `header`
 * and `footer` slots and falls back to the router's <Outlet /> for content.
 * `ErrorBoundary` wraps it rather than being the route's `errorElement`: it is
 * a plain React error boundary taking `children`.
 */
export const router = createBrowserRouter([
	{
		element: (
			<ErrorBoundary>
				<MarketingLayout />
			</ErrorBoundary>
		),
		children: [{ index: true, element: <HomeRoute /> }]
	},
	{ path: '*', element: <NotFound /> }
]);
