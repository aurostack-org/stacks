'use client';

import React, { useEffect } from 'react';

import { Button } from '@/components/ui/button';

import { reportError } from '@/telemetry/browser'; // @feature telemetry

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
	useEffect(() => {
		console.error(error);
		reportError(error, { source: 'error-boundary' }); // @feature telemetry
	}, [error]);

	return (
		<div className="mx-auto my-4 flex max-w-xl flex-col rounded-lg border border-border bg-card p-8 md:p-12">
			<h2 className="text-xl font-semibold">Something went wrong</h2>
			<p className="my-2 text-muted-foreground">This page could not be loaded. Please try again.</p>
			<Button className="mt-4 self-start" onClick={() => reset()}>
				Try again
			</Button>
		</div>
	);
}
