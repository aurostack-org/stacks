import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import '@/shared/ui/styles/globals.css';
import { Providers } from './app/providers';
import { router } from './app/router';

// If the first screen needs data immediately, kick its query off here rather
// than in a component effect: by this point every module above has finished
// evaluating and `providers` has already called `configureApi` at module scope,
// so the fetch races the session check instead of queueing behind it.

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Providers>
			<RouterProvider router={router} />
		</Providers>
	</StrictMode>
);
