'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** The /search box: updates `?q=` a moment after the visitor stops typing. */
export const SearchInput: React.FC<{ initial?: string }> = ({ initial = '' }) => {
	const [value, setValue] = useState(initial);
	const router = useRouter();

	useEffect(() => {
		if (value === initial) return;
		const timer = setTimeout(() => {
			router.replace(`/search${value ? `?q=${encodeURIComponent(value)}` : ''}`);
		}, 300);
		return () => clearTimeout(timer);
	}, [value, initial, router]);

	return (
		<form onSubmit={(e) => e.preventDefault()} role="search">
			<Label htmlFor="search" className="sr-only">
				Search
			</Label>
			<Input
				id="search"
				type="search"
				value={value}
				onChange={(event) => setValue(event.target.value)}
				placeholder="Search the site"
			/>
		</form>
	);
};
