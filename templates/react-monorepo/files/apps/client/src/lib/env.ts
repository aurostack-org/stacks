const env = import.meta.env;

/** Backend base URL (Better Auth lives at `${API_URL}/auth`). */
export const API_URL = env.VITE_APP_API_URL as string;
/** The Auth app users are redirected to for login. */
export const AUTH_HOST = env.VITE_APP_AUTH_HOST as string;
/** This client app's own origin. */
export const CLIENT_URL = env.VITE_APP_CLIENT_HOST as string;
/** The admin console origin. */
export const ADMIN_URL = env.VITE_APP_ADMIN_HOST as string;
/** The public marketing site (logout destination). */
export const LANDING_URL = env.VITE_APP_LANDING as string;

// @feature:start telemetry
/** OpenObserve browser monitoring (see @acme/telemetry); unset keeps it off. */
export const TELEMETRY = {
	url: env.VITE_OPENOBSERVE_URL as string | undefined,
	org: env.VITE_OPENOBSERVE_ORG as string | undefined,
	clientToken: env.VITE_OPENOBSERVE_CLIENT_TOKEN as string | undefined,
	environment: env.MODE
};
// @feature:end
