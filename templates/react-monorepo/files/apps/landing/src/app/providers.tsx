import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { configureApi } from '@inerds/api';
import { AuthProvider, configureAuth, redirectToLogin } from '@inerds/auth';
import { MetaProvider, ThemeProvider, Toaster, installZodErrorMap } from '@inerds/ui';
import { store } from './store';

const env = import.meta.env;
const apiBaseUrl = env.VITE_APP_API_URL;
const authAppUrl = env.VITE_APP_AUTH_HOST as string;

const trustedOrigins = [env.VITE_APP_LANDING, env.VITE_APP_CLIENT_HOST, env.VITE_APP_ADMIN_HOST, authAppUrl].filter(
	(value): value is string => Boolean(value)
);

// Wire the shared API + auth clients once, before rendering. The landing site is public, so a 401 is not automatically a redirect.
configureApi({ baseUrl: apiBaseUrl, onUnauthorized: () => redirectToLogin() });
configureAuth({
	authApiBaseUrl: `${apiBaseUrl}/auth`,
	authAppUrl,
	trustedOrigins,
	defaultRedirect: (env.VITE_APP_LANDING as string | undefined) ?? window.location.origin
});
installZodErrorMap();

export function Providers({ children }: { children: ReactNode }) {
	return (
		// ThemeProvider above the Redux Provider: it only touches the document
		// (`dark` class, color-scheme, theme-color meta) and must not re-render
		// through the store.
		<ThemeProvider>
			<MetaProvider>
				<Provider store={store}>
					<AuthProvider>
						{children}
						<Toaster />
					</AuthProvider>
				</Provider>
			</MetaProvider>
		</ThemeProvider>
	);
}
