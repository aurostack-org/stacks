import { redirect } from 'next/navigation';

import { getRedirects } from '@/redirects/getRedirects';
import { docPath } from '@/utilities/docPath';

/** Sends the visitor on if the owner set up a redirect for this path; otherwise returns. */
export async function followRedirect(url: string): Promise<void> {
	const redirects = await getRedirects();
	const to = redirects.find((item) => item.from === url)?.to;

	if (to?.type === 'custom' && to.url) redirect(to.url);

	const target = to?.reference;
	if (target && typeof target.value === 'object' && target.value?.slug) {
		redirect(docPath(target.relationTo, target.value.slug));
	}
}
