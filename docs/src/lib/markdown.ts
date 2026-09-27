// Tiny inline markdown for env notes: `code`, **bold**, [links](url). Notes are
// short, trusted strings from this repo, so no full parser is needed.
const escape = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function marked(text: string): string {
	return escape(text)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
			const url = href.startsWith('/') ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${href}` : href;
			return `<a href="${url}">${label}</a>`;
		});
}
