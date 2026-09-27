import { PageMeta } from '@acme/ui';
import { Section, SectionHeading } from '@acme/layouts';

export function HomeRoute() {
	return (
		<>
			{/* `title` is the page segment only — MetaProvider appends the brand. */}
			<PageMeta title="Home" />
			<Section>
				<SectionHeading
					eyebrow="Acme Corp"
					title="Replace this with your hero"
					lede="One sentence on what this product does, written for someone who has never heard of it."
				/>
			</Section>
		</>
	);
}
