import { Field, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { SWAGGER_OPTIONS } from 'common/constants';

@ObjectType()
class ApiInfo {
	@Field()
	title: string;

	@Field(() => String, { nullable: true })
	description?: string;

	constructor(title: string, description?: string) {
		this.title = title;
		this.description = description;
	}
}

/**
 * Root query type. Code-first schema generation fails without at least one
 * `@Query`, so this keeps the endpoint bootable until feature modules add
 * their own resolvers.
 */
@Resolver()
export class AppResolver {
	@Query(() => ApiInfo, { description: 'Basic information about the API' })
	@AllowAnonymous()
	info(): ApiInfo {
		const { info } = SWAGGER_OPTIONS;
		return new ApiInfo(info.title, info.description);
	}
}
