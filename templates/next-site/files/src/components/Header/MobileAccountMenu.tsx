'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/Auth';

/** The customer's account links in the mobile menu. */
export function MobileAccountMenu() {
	const { user } = useAuth();

	return user ? (
		<div className="mt-4">
			<h2 className="text-xl mb-4">My account</h2>
			<hr className="my-2" />
			<ul className="flex flex-col gap-2">
				<li>
					<Link href="/orders">Orders</Link>
				</li>
				<li>
					<Link href="/account/addresses">Addresses</Link>
				</li>
				<li>
					<Link href="/account">Manage account</Link>
				</li>
				<li className="mt-6">
					<Button asChild variant="outline">
						<Link href="/logout">Log out</Link>
					</Button>
				</li>
			</ul>
		</div>
	) : (
		<div>
			<h2 className="text-xl mb-4">My account</h2>
			<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
				<Button asChild className="w-full sm:flex-1" variant="outline">
					<Link href="/login">Log in</Link>
				</Button>
				<span className="text-center text-sm text-muted-foreground sm:text-base">or</span>
				<Button asChild className="w-full sm:flex-1">
					<Link href="/create-account">Create an account</Link>
				</Button>
			</div>
		</div>
	);
}
