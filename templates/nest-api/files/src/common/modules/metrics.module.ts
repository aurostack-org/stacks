import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
	makeHistogramProvider,
	PrometheusModule
} from '@willsoto/nestjs-prometheus';
import { MetricsController } from '../controllers';
import { MetricsInterceptor } from '../interceptors';

@Module({
	imports: [
		PrometheusModule.register({
			defaultLabels: { app: 'acme-api' },
			defaultMetrics: { enabled: true },
			controller: MetricsController
		})
	],
	providers: [
		makeHistogramProvider({
			name: 'http_request_duration_seconds',
			help: 'Duration of HTTP requests in seconds',
			labelNames: ['method', 'route', 'status'],
			buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
		}),
		{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }
	]
})
export class MetricsModule {}
