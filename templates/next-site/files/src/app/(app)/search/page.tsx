import configPromise from '@payload-config';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPayload, type Where } from 'payload';
import React from 'react';

import { docPath } from '@/utilities/docPath';
import { SearchInput } from '@/search/SearchInput';

type Args = {
	searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Args) {
	const { q = '' } = await searchParams;
	const query = q.trim();
	const payload = await getPayload({ config: configPromise });

	const where: Where | undefined = query
		? {
				or: [
					{ title: { like: query } },
					{ 'meta.title': { like: query } },
					{ 'meta.description': { like: query } },
					{ slug: { like: query } }
				]
			}
		: undefined;

	const results = query
		? await payload.find({
				collection: 'search',
				depth: 0,
				limit: 24,
				pagination: false,
				select: { title: true, slug: true, meta: true, doc: true },
				where
			})
		: null;

	return (
		<div className="container py-16 max-w-3xl">
			<h1 className="text-3xl font-medium mb-8">Search</h1>
			<SearchInput initial={query} />

			{results && (
				<div className="mt-10">
					{results.docs.length === 0 ? (
						<p>No results for “{query}”.</p>
					) : (
						<ul className="flex flex-col gap-6">
							{results.docs.map((result) => (
								<li key={result.id}>
									<Link href={docPath(result.doc.relationTo, result.slug || '')} className="block group">
										<p className="text-lg font-medium group-hover:underline">{result.meta?.title || result.title}</p>
										{result.meta?.description && (
											<p className="text-sm text-muted-foreground">{result.meta.description}</p>
										)}
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}

export const metadata: Metadata = {
	title: 'Search'
};
