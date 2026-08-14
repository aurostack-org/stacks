import { defineAppConfig } from '@inerds/config/vite';
import { BRAND } from '@inerds/ui/brand';
import { THEME_COLORS } from '@inerds/ui/theme-colors';

// `themeColors` substitutes %THEME_LIGHT%/%THEME_DARK% into index.html — the
// pre-paint theme script and the `html` background both need them, and HTML
// can't import. `appTitle` substitutes %APP_TITLE% for the same reason: the
// static <title> must match the suffix MetaProvider appends at runtime.
export default defineAppConfig({
	rootDir: import.meta.dirname,
	themeColors: THEME_COLORS,
	appTitle: BRAND.adminName
});
