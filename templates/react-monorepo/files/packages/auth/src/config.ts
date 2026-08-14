import { initAuthClient } from './client';
import { configureRedirects } from './redirect';

/**
 * One-shot auth wiring, called by each app at startup (before rendering).
 *   - authApiBaseUrl: the backend Better Auth base URL (e.g. https://api…/api/auth)
 *   - authAppUrl: the Auth app origin unauthenticated users are sent to
 *   - trustedOrigins: origins allowed as post-login redirect targets
 */
export function configureAuth(options: {
	authApiBaseUrl: string;
	authAppUrl: string;
	trustedOrigins: string[];
	defaultRedirect?: string;
}): void {
	initAuthClient(options.authApiBaseUrl);
	configureRedirects({
		authAppUrl: options.authAppUrl,
		trustedOrigins: options.trustedOrigins,
		defaultRedirect: options.defaultRedirect
	});
}
