import React from 'react';

import { ProductGridItem } from '@/components/ProductGridItem';
import type { Product } from '@/payload-types';

export type Props = {
	products: Product[];
};

/** The Archive block's product grid: the same cards as the shop page. */
export const CollectionArchive: React.FC<Props> = ({ products }) => (
	<div className="container">
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{products
				.filter((product) => typeof product === 'object' && product !== null)
				.map((product) => (
					<ProductGridItem key={product.id} product={product} />
				))}
		</div>
	</div>
);
