import type { PluginOption, UserConfig, UserConfigExport } from 'vite';

export interface DefineAppConfigOptions {
	/** The app root directory. Pass `import.meta.dirname`. */
	rootDir: string;
	/**
	 * Theme background colours, used to substitute `%THEME_LIGHT%` / `%THEME_DARK%`
	 * in `index.html`. Pass `THEME_COLORS` from `@acme/ui/theme-colors`; omitting
	 * it leaves the placeholders in the markup.
	 */
	themeColors?: { light: string; dark: string };
	/** Extra plugins appended after the base React + Tailwind plugins. */
	plugins?: PluginOption[];
	/** Optional Vite config overrides merged into the base config. */
	overrides?: UserConfig;
}

export function defineAppConfig(options: DefineAppConfigOptions): UserConfigExport;
