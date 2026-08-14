/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" /> // @feature pwa

interface ImportMetaEnv {
	VITE_APP_API_URL: string;
	VITE_APP_ALLOWED_HOSTS: string;
	VITE_APP_SITE_URL: string; // @feature marketing
	VITE_APP_SUPPORT_EMAIL: string; // @feature marketing
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
