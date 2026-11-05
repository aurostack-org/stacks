'use client';

import React, { useSyncExternalStore } from 'react';

import { ThemeToggle } from '@/components/ui/theme/theme-toggle';

const subscribe = () => () => {};

/**
 * The kit's theme toggle, rendered only in the browser: it shows the stored
 * choice, which the server cannot know, so rendering it there would not match.
 */
export function ThemeSwitch({ className }: { className?: string }) {
	const hydrated = useSyncExternalStore(
		subscribe,
		() => true,
		() => false
	);
	return hydrated ? <ThemeToggle className={className} /> : <span aria-hidden className="inline-block size-9" />;
}
