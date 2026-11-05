import React from 'react';

import { Media } from '@/components/Media';
import type { Media as MediaDoc } from '@/payload-types';
import { cn } from '@/utilities/cn';

const SITE_NAME = process.env.SITE_NAME || 'Acme Corp';

/**
 * The business's logo, uploaded in the admin (Header → Logo), or its name in
 * text until one is.
 */
export function SiteLogo({ logo, className }: { logo?: MediaDoc | number | null; className?: string }) {
	if (logo && typeof logo === 'object') {
		return (
			<Media
				resource={logo}
				alt={SITE_NAME}
				className={cn('h-8 w-auto', className)}
				imgClassName="h-8 w-auto object-contain"
			/>
		);
	}
	return <span className={cn('text-lg font-semibold tracking-tight', className)}>{SITE_NAME}</span>;
}
