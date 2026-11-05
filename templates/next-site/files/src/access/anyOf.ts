import type { Access } from 'payload';

/**
 * Allows the operation when any of the given rules does. A rule that returns
 * a query (`Where`) rather than `true` is not combined; this is meant for
 * plain yes/no rules.
 */
export const anyOf =
	(...rules: Access[]): Access =>
	async (args) => {
		for (const rule of rules) {
			if ((await rule(args)) === true) return true;
		}
		return false;
	};
