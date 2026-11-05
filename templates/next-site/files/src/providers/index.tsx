import React from 'react';

import { ThemeProvider } from '@/components/ui/theme/theme-provider';
import { SonnerProvider } from '@/providers/Sonner';

import { ShopProviders } from './Shop'; // @feature shop
import { TelemetryProvider } from '@/telemetry/browser'; // @feature telemetry

type Wrapper = React.FC<{ children: React.ReactNode }>;

/** Providers a feature adds, outermost first. */
const featureProviders: Wrapper[] = [
	TelemetryProvider, // @feature telemetry
	ShopProviders // @feature shop
];

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const content = featureProviders.reduceRight<React.ReactNode>(
		(inner, Provider) => <Provider>{inner}</Provider>,
		children
	);

	return (
		<ThemeProvider>
			<SonnerProvider />
			{content}
		</ThemeProvider>
	);
};
