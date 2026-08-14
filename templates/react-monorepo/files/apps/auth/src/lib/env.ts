const env = import.meta.env;

export const APP_URL = env.VITE_APP_CLIENT_HOST;
export const ADMIN_URL = env.VITE_APP_ADMIN_HOST;
export const API_URL = env.VITE_APP_API_URL;
/** Terms and Privacy live on the marketing site, which is a different origin. */
export const LANDING_URL = env.VITE_APP_LANDING;
export const AUTH_URL = window.location.origin;
