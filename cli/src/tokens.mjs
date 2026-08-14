/**
 * Token substitution.
 *
 * Template files hold real, working identifiers (`@inerds/ui`, `Investment
 * Nerds`, `starter`) rather than `__PLACEHOLDER__` sludge — that is what keeps
 * a template compilable and testable in place. Renaming therefore happens by
 * declared search/replace pairs in template.json, whose replacement side may
 * interpolate `{{name}}`, `{{Name}}`, `{{scope}}` and friends.
 */

const WORD_SPLIT = /[^a-zA-Z0-9]+|(?<=[a-z0-9])(?=[A-Z])/;

function words(input) {
	return String(input)
		.split(WORD_SPLIT)
		.map((w) => w.trim())
		.filter(Boolean);
}

export function kebab(s) {
	return words(s).map((w) => w.toLowerCase()).join('-');
}

export function snake(s) {
	return words(s).map((w) => w.toLowerCase()).join('_');
}

export function constant(s) {
	return words(s).map((w) => w.toUpperCase()).join('_');
}

export function pascal(s) {
	return words(s)
		.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
		.join('');
}

export function camel(s) {
	const p = pascal(s);
	return p ? p[0].toLowerCase() + p.slice(1) : p;
}

export function title(s) {
	return words(s)
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');
}

/** Build the interpolation context every replacement and hook sees. */
export function buildContext({ name, scope, description, port, author }) {
	const kebabName = kebab(name);
	return {
		name: kebabName,
		Name: title(name),
		pascal: pascal(name),
		camel: camel(name),
		snake: snake(name),
		constant: constant(name),
		scope: kebab(scope || name),
		description: description || `${title(name)} service`,
		port: String(port ?? 5000),
		author: author || '',
		year: String(new Date().getFullYear())
	};
}

/** Interpolate `{{key}}` against the context. Unknown keys are left intact. */
export function interpolate(template, ctx) {
	return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) =>
		Object.prototype.hasOwnProperty.call(ctx, key) ? ctx[key] : m
	);
}

/**
 * Compile template.json `replacements` into applicable rules.
 * Each rule: { from, to, regex?, flags?, when? }.
 * `when` is a feature expression — a rule can be conditional on a feature.
 */
export function compileReplacements(rules, ctx) {
	return (rules || []).map((rule) => {
		const to = interpolate(rule.to, ctx);
		if (rule.regex) {
			return {
				test: new RegExp(rule.from, rule.flags || 'g'),
				to,
				when: rule.when
			};
		}
		// Literal search: escape, then apply globally.
		const escaped = rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return { test: new RegExp(escaped, 'g'), to, when: rule.when };
	});
}

export function applyReplacements(content, compiled, enabled, evalExpr) {
	let out = content;
	for (const rule of compiled) {
		if (rule.when && !evalExpr(rule.when, enabled)) continue;
		out = out.replace(rule.test, rule.to);
	}
	return out;
}
