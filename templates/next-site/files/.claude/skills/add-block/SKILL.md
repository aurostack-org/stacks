---
name: add-block
description: Add a page-builder block to this site — its fields in the admin, the component that renders it, and its registration — so the owner can place it on any page. Use when asked for "a testimonials section", "a pricing table", "an FAQ block", "a team grid", or any new kind of section on pages.
---

# Add a page-builder block

A block is a section the owner places on a page in the admin (Pages → a page →
Content → Add block). It has two halves that must agree on their fields.

## 1. The fields: `src/blocks/<Name>/config.ts`

```ts
import type { Block } from 'payload';

export const Testimonials: Block = {
	slug: 'testimonials', // the stored blockType; never rename it once pages use it
	interfaceName: 'TestimonialsBlock', // the generated TypeScript type
	labels: { singular: 'Testimonials', plural: 'Testimonials' },
	fields: [
		{ name: 'heading', type: 'text' },
		{
			name: 'items',
			type: 'array',
			minRows: 1,
			fields: [
				{ name: 'quote', type: 'textarea', required: true },
				{ name: 'author', type: 'text', required: true },
				{ name: 'photo', type: 'upload', relationTo: 'media' }
			]
		}
	]
};
```

Write labels and `admin.description` for the owner, in plain words. Prefer
`text`, `textarea`, `upload`, `select` and `array` over rich text unless the
owner genuinely needs formatting; copy an existing block's `lexicalEditor`
setup when they do.

## 2. Register it

- `src/collections/Pages/index.ts`: add it to the `layout` field's `blocks`.
- Run `yarn generate:types`. `TestimonialsBlock` now exists in
  `@/payload-types`.

## 3. The component: `src/blocks/<Name>/Component.tsx`

```tsx
import React from 'react';

import { Media } from '@/components/Media';
import type { TestimonialsBlock as Props } from '@/payload-types';

export const TestimonialsBlock: React.FC<Props & { id?: string }> = ({ heading, items }) => (
	<section className="container">
		{heading && <h2 className="text-3xl font-medium mb-8">{heading}</h2>}
		<ul className="grid gap-6 md:grid-cols-3">
			{items?.map((item) => (
				<li key={item.id} className="bg-card border border-border rounded-lg p-6">
					<p className="text-lg">“{item.quote}”</p>
					<p className="mt-4 text-sm text-muted-foreground">{item.author}</p>
				</li>
			))}
		</ul>
	</section>
);
```

Then add it to `blockComponents` in `src/blocks/RenderBlocks.tsx`, keyed by
the block's `slug`.

- Theme tokens only (`bg-card`, `text-muted-foreground`, `border-border`), no
  hex colours. Check light and dark.
- A server component by default. Interactive parts go in a separate
  `Component.client.tsx` with `'use client'`, as `src/blocks/Code` does.
- Render nothing for empty optional fields rather than empty markup.

## 4. Check it

`yarn typecheck && yarn lint`, then in `yarn dev` add the block to a page in
the admin, publish, and view the page at phone and desktop width.

Before deploying, the new block is a schema change: create a migration
(`yarn payload migrate:create add-testimonials-block`) and commit it.
