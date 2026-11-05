/**
 * Builds Lexical rich-text values for seed content, so a page reads as its
 * words rather than as several hundred lines of editor JSON.
 *
 *   richText(h1('Welcome'), p('We bake bread.'))
 */
type Node = { [k: string]: unknown; type: string; version: number };

const text = (value: string): Node => ({
	type: 'text',
	detail: 0,
	format: 0,
	mode: 'normal',
	style: '',
	text: value,
	version: 1
});

const block = (type: string, value: string, extra: Record<string, unknown> = {}): Node => ({
	type,
	children: [text(value)],
	direction: 'ltr',
	format: '',
	indent: 0,
	version: 1,
	...extra
});

export const h1 = (value: string) => block('heading', value, { tag: 'h1' });
export const h2 = (value: string) => block('heading', value, { tag: 'h2' });
export const h3 = (value: string) => block('heading', value, { tag: 'h3' });
export const p = (value: string) => block('paragraph', value, { textFormat: 0, textStyle: '' });

export function richText(...children: Node[]) {
	return {
		root: {
			type: 'root',
			children,
			direction: 'ltr' as const,
			format: '' as const,
			indent: 0,
			version: 1
		}
	};
}
