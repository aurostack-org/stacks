// Cross-app redirect helpers with open-redirect protection. The Auth app lives
// on its own origin; Client/Admin send unauthenticated users here and get them
// back to where they started. Redirect targets are validated against an
// allowlist so an attacker can't craft ?redirect=https://evil.example.

let authAppUrl = '';
let trustedOrigins: string[] = [];
let defaultRedirect = '';

export function configureRedirects(options: {
	authAppUrl: string;
	trustedOrigins: string[];
	defaultRedirect?: string;
}): void {
	authAppUrl = options.authAppUrl.replace(/\/$/, '');
	trustedOrigins = options.trustedOrigins.map((origin) => origin.replace(/\/$/, ''));
	defaultRedirect = options.defaultRedirect ?? '';
}

/** Validate a redirect target against the trusted-origin allowlist. */
export function getSafeRedirect(target: string | null | undefined, fallback: string = defaultRedirect): string {
	if (!target) return fallback;
	try {
		const url = new URL(target, window.location.origin);
		if (trustedOrigins.includes(url.origin)) return url.toString();
	} catch {
		/* not a valid URL — fall through to fallback */
	}
	return fallback;
}

/** Send an unauthenticated user to the Auth app, preserving where they were. */
export function redirectToLogin(returnTo: string = window.location.href): void {
	const url = new URL('/login', authAppUrl || window.location.origin);
	url.searchParams.set('redirect', returnTo);
	window.location.assign(url.toString());
}
