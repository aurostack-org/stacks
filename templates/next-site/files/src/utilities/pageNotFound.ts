import { notFound } from 'next/navigation';

import { followRedirect } from '@/redirects/followRedirect'; // @feature redirects

/**
 * Call where a page or product does not exist: follows a redirect the owner
 * set up for this path in the admin, or shows the 404.
 */
export async function pageNotFound(url: string): Promise<never> {
	await followRedirect(url); // @feature redirects
	notFound();
}
