'use client';

import type { Header } from '@/payload-types';

import { CMSLink } from '@/components/Link';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MenuIcon } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { MobileAccountMenu } from './MobileAccountMenu'; // @feature shop

/** Sections below the menu links. Each entry is its own line so a feature can own one. */
const accountMenus: React.ReactNode[] = [
	<MobileAccountMenu key="account" /> // @feature shop
];

interface Props {
	menu: Header['navItems'];
}

export function MobileMenu({ menu }: Props) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isOpen, setIsOpen] = useState(false);

	const closeMobileMenu = () => setIsOpen(false);

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth > 768) {
				setIsOpen(false);
			}
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [isOpen]);

	useEffect(() => {
		setIsOpen(false);
	}, [pathname, searchParams]);

	return (
		<Sheet onOpenChange={setIsOpen} open={isOpen}>
			<SheetTrigger className="relative flex h-11 w-11 items-center justify-center rounded-md border border-border text-foreground transition-colors">
				<MenuIcon className="h-4" />
			</SheetTrigger>

			<SheetContent side="left" className="px-4">
				<SheetHeader className="px-0 pt-4 pb-0">
					<SheetTitle>My Store</SheetTitle>

					<SheetDescription />
				</SheetHeader>

				<div className="py-4">
					{menu?.length ? (
						<ul className="flex w-full flex-col">
							{menu.map((item) => (
								<li className="py-2" key={item.id}>
									<CMSLink {...item.link} appearance="link" />
								</li>
							))}
						</ul>
					) : null}
				</div>

				{accountMenus}
			</SheetContent>
		</Sheet>
	);
}
