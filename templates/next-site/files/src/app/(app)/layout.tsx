import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminBar } from '@/components/AdminBar';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { LivePreviewListener } from '@/components/LivePreviewListener';
import { Providers } from '@/providers';
import { THEME_COLORS } from '@/components/ui/theme/theme-colors';
import { themeInitScript } from '@/components/ui/theme/init-script';
import React from 'react';
import { getServerSideURL } from '@/utilities/getURL';
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph';

import './globals.css';

// Every storefront page reads Payload at request time: the Docker image is
// built without a database, so nothing here can be prerendered, and an
// owner's edit in the admin shows on the next page view.
export const dynamic = 'force-dynamic';

// metadataBase turns relative image URLs in link previews into absolute ones.
export const metadata: Metadata = {
	metadataBase: new URL(getServerSideURL()),
	title: process.env.SITE_NAME || 'Acme Corp',
	openGraph: mergeOpenGraph()
};

export default async function RootLayout({ children }: { children: ReactNode }) {
	return (
		// The init script sets the theme class on <html> before the page paints,
		// so React must not treat that attribute as a mismatch.
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
				<meta name="theme-color" content={THEME_COLORS.light} />
				<link href="/favicon.ico" rel="icon" sizes="32x32" />
				<link href="/favicon.svg" rel="icon" type="image/svg+xml" />
			</head>
			<body>
				<Providers>
					<AdminBar />
					<LivePreviewListener />

					<Header />
					<main>{children}</main>
					<Footer />
				</Providers>
			</body>
		</html>
	);
}
