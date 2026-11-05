import { NAV_LINK_CLASSES } from '@/components/Link';
import { cn } from '@/utilities/cn';
import clsx from 'clsx';
import { ShoppingCart } from 'lucide-react';
import React from 'react';

export function OpenCartButton({ className, quantity, ...rest }: { className?: string; quantity?: number }) {
	return (
		<button
			type="button"
			className={cn(NAV_LINK_CLASSES, 'navLink relative flex items-end gap-2 hover:cursor-pointer', className)}
			{...rest}
		>
			<span>Cart</span>

			{quantity ? (
				<>
					<span>•</span>
					<span>{quantity}</span>
				</>
			) : null}
		</button>
	);
}
