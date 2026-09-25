import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	SetMetadata,
	UseGuards,
	applyDecorators
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService, type AppFeatures } from 'common/services';

export const FEATURE_FLAG_KEY = 'feature-flag';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly flags: FeatureFlagService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const flag = this.reflector.getAllAndOverride<
			(string & keyof AppFeatures) | undefined
		>(FEATURE_FLAG_KEY, [context.getHandler(), context.getClass()]);

		if (!flag) return true;

		// Evaluate with the session user's attributes so GrowthBook targeting
		// (e.g. a `role`-scoped rule, or a percentage rollout by `id`) applies.
		// Anonymous routes (no session) fall back to a plain global evaluation.
		const user = context.switchToHttp().getRequest()?.session?.user;
		const attributes = user ? { id: user.id, role: user.role } : {};

		if (this.flags.isOn(flag, attributes)) return true;

		throw new ForbiddenException('This feature is not currently available.');
	}
}

/**
 * Gate a route (or controller) behind a GrowthBook boolean flag. Responds 403
 * when the flag is off or cannot be resolved. Signed-in requests are evaluated
 * with the user's `id` and `role`; anonymous ones globally.
 */
export function RequireFeature(flag: string & keyof AppFeatures) {
	return applyDecorators(
		SetMetadata(FEATURE_FLAG_KEY, flag),
		UseGuards(FeatureFlagGuard)
	);
}
