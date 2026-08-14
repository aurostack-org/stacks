import { PageMeta } from '@/shared/ui';
import { Section, SectionHeading } from '@/shared/layouts';

export function HomeRoute() {
	return (
		<>
			{/* `title` is the page segment only — MetaProvider appends the brand. */}
			<PageMeta title="Home" />
			<Section>
				<SectionHeading
					eyebrow="Investment Nerds"
					title="Replace this with your hero"
					lede="One sentence on what this product does, written for someone who has never heard of it."
				/>
			</Section>
		</>
	);
}
