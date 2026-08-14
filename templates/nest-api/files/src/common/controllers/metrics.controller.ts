import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';

@ApiTags('App')
@Controller()
// Scraped on a fixed interval by Prometheus; already gated by basic auth.
@SkipThrottle()
export class MetricsController extends PrometheusController {
	@Get()
	@ApiExcludeEndpoint()
	@AllowAnonymous()
	async index(@Res({ passthrough: true }) response: Response): Promise<string> {
		return super.index(response);
	}
}
