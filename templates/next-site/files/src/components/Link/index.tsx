import Link from 'next/link';
import React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/utilities/cn';
import { docPath } from '@/utilities/docPath';

/**
 * How a link looks. `default` and `outline` are what the admin's link field
 * stores on pages (`default` is the kit's primary button); `nav` is a header
 * menu link; `inline` a plain text link, as inside rich text.
 */
type Appearance = 'inline' | 'nav' | 'default' | NonNullable<ButtonProps['variant']>;

type CMSLinkType = {
	appearance?: Appearance | null;
	children?: React.ReactNode;
	className?: string;
	label?: string | null;
	newTab?: boolean | null;
	reference?: {
		relationTo: string;
		value: { slug?: string | null } | string | number;
	} | null;
	size?: ButtonProps['size'] | null;
	type?: 'custom' | 'reference' | null;
	url?: string | null;
};

export const NAV_LINK_CLASSES =
	'text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground';

export const CMSLink: React.FC<CMSLinkType> = (props) => {
	const { type, appearance = 'inline', children, className, label, newTab, reference, size, url } = props;

	const href =
		type === 'reference' && typeof reference?.value === 'object' && reference.value.slug
			? docPath(reference.relationTo, reference.value.slug)
			: url;

	if (!href) return null;

	const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {};
	const content = (
		<>
			{label}
			{children}
		</>
	);

	if (appearance === 'inline' || appearance === 'nav' || !appearance) {
		return (
			<Link className={cn(appearance === 'nav' && NAV_LINK_CLASSES, className)} href={href} {...newTabProps}>
				{content}
			</Link>
		);
	}

	return (
		<Button asChild className={className} size={size} variant={appearance === 'default' ? 'primary' : appearance}>
			<Link href={href} {...newTabProps}>
				{content}
			</Link>
		</Button>
	);
};
