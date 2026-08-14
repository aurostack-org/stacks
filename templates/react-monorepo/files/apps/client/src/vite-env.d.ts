/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
	VITE_APP_API_URL: string;
	VITE_APP_ALLOWED_HOSTS: string;
	VITE_APP_AUTH_HOST: string;
	VITE_APP_LANDING: string;
	VITE_APP_ADMIN_HOST: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
