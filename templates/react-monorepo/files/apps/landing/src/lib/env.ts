const env = import.meta.env;

export const API_URL = env.VITE_APP_API_URL;
export const AUTH_HOST = env.VITE_APP_AUTH_HOST;
export const CLIENT_HOST = env.VITE_APP_CLIENT_HOST;
/** Support inbox shown on /contact. Per-environment, so it is never hardcoded —
 *  it must match the backend's SMTP_SUPPORT_EMAIL, which is where the form
 *  actually posts. Falsy when the build arg is missing; the UI hides the block
 *  rather than rendering `mailto:undefined`. */
export const SUPPORT_EMAIL = env.VITE_APP_SUPPORT_EMAIL;
