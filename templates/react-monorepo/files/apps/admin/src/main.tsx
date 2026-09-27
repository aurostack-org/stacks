import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initTelemetry } from '@acme/telemetry'; // @feature telemetry
import { API_URL, TELEMETRY } from './lib/env'; // @feature telemetry
import { RouterProvider } from 'react-router';
import '@acme/ui/globals.css';
import { Providers } from './app/providers';
import { router } from './app/router';

initTelemetry({ service: 'acme-admin', ...TELEMETRY, apiUrls: [API_URL] }); // @feature telemetry

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Providers>
			<RouterProvider router={router} />
		</Providers>
	</StrictMode>
);
