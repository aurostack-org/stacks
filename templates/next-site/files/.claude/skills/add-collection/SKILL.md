---
name: add-collection
description: Add a new kind of content to this site's admin — a Payload collection with its fields, access rules, admin grouping, generated types, a public page if it needs one, and the migration — e.g. "team members", "events", "services", "testimonials" the owner manages as a list. Use when the owner needs to add and edit many items of something, not one section of one page.
---

# Add a collection

Choose first: a **collection** is a list of things the owner adds and edits
(events, team members, services). One section of a page is a block (the
add-block skill); one set of site-wide settings is a global (see
`src/globals/`).

## 1. The collection: `src/collections/<Name>.ts`

```ts
import type { CollectionConfig } from 'payload';
import { slugField } from 'payload';

import { adminOnly } from '@/access/adminOnly';
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus';

export const Events: CollectionConfig = {
	slug: 'events',
	admin: {
		group: 'Content', // where it sits in the admin sidebar
		useAsTitle: 'title',
		defaultColumns: ['title', 'startsAt', '_status']
	},
	access: {
		create: adminOnly,
		update: adminOnly,
		delete: adminOnly,
		read: adminOrPublishedStatus // visitors see published items only
	},
	versions: { drafts: true }, // gives the owner Save draft / Publish
	fields: [
		{ name: 'title', type: 'text', required: true },
		{ name: 'startsAt', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
		{ name: 'image', type: 'upload', relationTo: 'media' },
		{ name: 'description', type: 'textarea' },
		slugField()
	]
};
```

- **Access is the security**, not the page that lists the items: `/api/events`
  serves whatever `read` allows. Use the rules in `src/access/`; write a new
  one there rather than inline.
- Labels and descriptions are for the owner: plain words, no field jargon.
- Add it to `collections` in `src/payload.config.ts`.

## 2. Types

`yarn generate:types`, then use `Event` from `@/payload-types`.

## 3. A public page, if it needs one

`src/app/(app)/events/page.tsx` (the list) and
`src/app/(app)/events/[slug]/page.tsx` (one item), reading with the Local API:

```ts
const payload = await getPayload({ config: configPromise });
const { docs } = await payload.find({
	collection: 'events',
	where: { _status: { equals: 'published' } },
	sort: 'startsAt',
	depth: 1
});
```

When an item is not found, `return pageNotFound(url)` from
`@/utilities/pageNotFound`, so the owner's redirects still apply. Teach
`docPath` in `src/utilities/docPath.ts` the collection's URL if it is not
`/<collection>/<slug>`. Pages render per request; do not add
`generateStaticParams` or `unstable_cache` (see CLAUDE.md).

Add a menu link through the admin (Header), not in code.

## 4. Check and migrate

`yarn typecheck && yarn lint`; in `yarn dev`, create, publish and view an item.
Before deploying: `yarn payload migrate:create add-events` and commit
`src/migrations/`.
