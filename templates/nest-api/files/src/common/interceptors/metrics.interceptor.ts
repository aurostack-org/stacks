import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { Observable, tap } from 'rxjs';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
	constructor(
		@InjectMetric('http_request_duration_seconds')
		private readonly histogram: Histogram<string>
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		if (context.getType() !== 'http') {
			return next.handle();
		}

		const http = context.switchToHttp();
		const req = http.getRequest();
		const res = http.getResponse();
		const stop = this.histogram.startTimer();

		const observe = () =>
			stop({
				method: req.method,
				route: req.route?.path ?? 'unmatched',
				status: res.statusCode
			});

		return next.handle().pipe(tap({ next: observe, error: observe }));
	}
}
