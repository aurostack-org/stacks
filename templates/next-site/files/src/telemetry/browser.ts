'use client';

// Browser monitoring (RUM) and logs, sent to OpenObserve: page views, errors,
// slow resources and user actions, plus console errors as logs. Requests to
// this site carry a W3C `traceparent` header, so a click links to the server
// trace it caused. Off until NEXT_PUBLIC_OPENOBSERVE_* are set; everything
// here is then a no-op.
import { openobserveLogs } from '@openobserve/browser-logs';
import { DefaultPrivacyLevel, openobserveRum } from '@openobserve/browser-rum';
import React, { useEffect } from 'react';

let started = false;

function initTelemetry(): boolean {
	const url = process.env.NEXT_PUBLIC_OPENOBSERVE_URL;
	const org = process.env.NEXT_PUBLIC_OPENOBSERVE_ORG;
	// A RUM client token (Ingestion → RUM): write-only and built for shipping in
	// a bundle. Never the server's ingestion token.
	const clientToken = process.env.NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN;
	if (started || !url || !org || !clientToken) return false;

	// The SDK takes a bare host (no scheme) plus an explicit plain-HTTP flag.
	const { host, protocol } = new URL(url);
	const service = 'acme-site-web';
	const common = {
		clientToken,
		site: host,
		organizationIdentifier: org,
		insecureHTTP: protocol === 'http:',
		service,
		env: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV
	};

	openobserveRum.init({
		...common,
		applicationId: service,
		sessionSampleRate: 100,
		sessionReplaySampleRate: 0,
		defaultPrivacyLevel: DefaultPrivacyLevel.MASK_USER_INPUT,
		trackResources: true,
		trackLongTasks: true,
		trackUserInteractions: true,
		allowedTracingUrls: [{ match: window.location.origin, propagatorTypes: ['tracecontext'] }]
	});
	openobserveLogs.init({ ...common, forwardErrorsToLogs: true });
	started = true;
	return true;
}

/** Report a handled error, e.g. from an error boundary. */
export function reportError(error: unknown, context?: object): void {
	if (started) openobserveRum.addError(error, context);
}

/** Tie the session to a signed-in user (id only), or clear it on logout. */
export function setTelemetryUser(user: { id: string | number } | null): void {
	if (!started) return;
	if (user) openobserveRum.setUser({ id: String(user.id) });
	else openobserveRum.clearUser();
}

/** Starts browser monitoring; mounted once through the root Providers. */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		initTelemetry();
	}, []);
	return children;
}
