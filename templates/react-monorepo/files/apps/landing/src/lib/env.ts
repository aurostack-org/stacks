const env = import.meta.env;

export const API_URL = env.VITE_APP_API_URL;
export const AUTH_HOST = env.VITE_APP_AUTH_HOST;
export const CLIENT_HOST = env.VITE_APP_CLIENT_HOST;
/** Support inbox shown on /contact. Per-environment, so it is never hardcoded —
 *  it must match the backend's SMTP_SUPPORT_EMAIL, which is where the form
 *  actually posts. Falsy when the build arg is missing; the UI hides the block
 *  rather than rendering `mailto:undefined`. */
export const SUPPORT_EMAIL = env.VITE_APP_SUPPORT_EMAIL;

// @feature:start telemetry
/** OpenObserve browser monitoring (see @acme/telemetry); unset keeps it off. */
export const TELEMETRY = {
	url: env.VITE_OPENOBSERVE_URL as string | undefined,
	org: env.VITE_OPENOBSERVE_ORG as string | undefined,
	clientToken: env.VITE_OPENOBSERVE_CLIENT_TOKEN as string | undefined,
	environment: env.MODE
};
// @feature:end
