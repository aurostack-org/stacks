import { FooterMenu } from '@/components/Footer/menu';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { getGlobal } from '@/utilities/getGlobals';
import Link from 'next/link';
import React, { Suspense } from 'react';
import { SiteLogo } from '@/components/SiteLogo';

const { COMPANY_NAME, SITE_NAME } = process.env;

export async function Footer() {
	const [footer, header] = await Promise.all([getGlobal('footer', 1), getGlobal('header', 1)]);
	const menu = footer.navItems || [];
	const currentYear = new Date().getFullYear();
	const skeleton = 'w-full h-6 animate-pulse rounded bg-muted';

	const copyrightName = COMPANY_NAME || SITE_NAME || '';

	return (
		<footer className="text-sm text-muted-foreground">
			<div className="container">
				<div className="flex w-full flex-col gap-6 border-t border-border py-12 text-sm md:flex-row md:gap-12">
					<div>
						<Link className="flex items-center gap-2 text-foreground md:pt-1" href="/">
							<SiteLogo logo={header.logo} />
						</Link>
					</div>
					<Suspense
						fallback={
							<div className="flex h-[188px] w-[200px] flex-col gap-2">
								<div className={skeleton} />
								<div className={skeleton} />
								<div className={skeleton} />
								<div className={skeleton} />
								<div className={skeleton} />
								<div className={skeleton} />
							</div>
						}
					>
						<FooterMenu menu={menu} />
					</Suspense>
					<div className="md:ml-auto flex flex-col gap-4 items-end">
						<ThemeSwitch />
					</div>
				</div>
			</div>
			<div className="border-t border-border py-6 text-sm">
				<div className="container mx-auto flex w-full flex-col items-center gap-1 md:flex-row md:gap-0">
					<p>
						&copy; {currentYear} {copyrightName}
						{copyrightName.length && !copyrightName.endsWith('.') ? '.' : ''} All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}
