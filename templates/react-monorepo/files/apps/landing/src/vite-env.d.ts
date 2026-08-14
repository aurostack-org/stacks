/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
	VITE_APP_API_URL: string;
	VITE_APP_ALLOWED_HOSTS: string;
	VITE_APP_AUTH_HOST: string;
	VITE_APP_CLIENT_HOST: string;
	VITE_APP_ADMIN_HOST: string;
	VITE_APP_SUPPORT_EMAIL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
