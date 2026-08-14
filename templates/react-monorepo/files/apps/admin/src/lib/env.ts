const env = import.meta.env;

/** Backend base URL (Better Auth lives at `${API_URL}/auth`). */
export const API_URL = env.VITE_APP_API_URL as string;
/** The Auth app users are redirected to for login. */
export const AUTH_HOST = env.VITE_APP_AUTH_HOST as string;
/** This admin console's own origin. */
export const ADMIN_URL = env.VITE_APP_ADMIN_HOST as string;
/** The client app origin. */
export const CLIENT_URL = env.VITE_APP_CLIENT_HOST as string;
/** The public marketing site (logout destination). */
export const LANDING_URL = env.VITE_APP_LANDING as string;
