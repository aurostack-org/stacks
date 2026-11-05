import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'; // @feature shop
import { BannerBlock } from '@/blocks/Banner/Component';
import { CallToActionBlock } from '@/blocks/CallToAction/Component';
import { CarouselBlock } from '@/blocks/Carousel/Component'; // @feature shop
import { ContentBlock } from '@/blocks/Content/Component';
import { FormBlock } from '@/blocks/Form/Component';
import { MediaBlock } from '@/blocks/MediaBlock/Component';
import { ThreeItemGridBlock } from '@/blocks/ThreeItemGrid/Component'; // @feature shop
import { toKebabCase } from '@/utilities/toKebabCase';
import React, { Fragment } from 'react';

import type { Page } from '../payload-types';

const blockComponents = {
	archive: ArchiveBlock, // @feature shop
	banner: BannerBlock,
	carousel: CarouselBlock, // @feature shop
	content: ContentBlock,
	cta: CallToActionBlock,
	formBlock: FormBlock,
	mediaBlock: MediaBlock,
	threeItemGrid: ThreeItemGridBlock // @feature shop
};

export const RenderBlocks: React.FC<{
	blocks: Page['layout'][0][];
}> = (props) => {
	const { blocks } = props;

	const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0;

	if (hasBlocks) {
		return (
			<Fragment>
				{blocks.map((block, index) => {
					const { blockName, blockType } = block;

					if (blockType && blockType in blockComponents) {
						const Block = blockComponents[blockType];

						if (Block) {
							return (
								<div className="my-16" key={index}>
									{/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
									{/* @ts-ignore - weird type mismatch here */}
									<Block id={toKebabCase(blockName!)} {...block} />
								</div>
							);
						}
					}
					return null;
				})}
			</Fragment>
		);
	}

	return null;
};
