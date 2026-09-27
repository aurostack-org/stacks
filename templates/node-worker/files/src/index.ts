import logger from '#app/logger.js';
import * as Workers from '#app/workers/index.js'; // @feature queue
import { createTemporalWorker } from '#app/temporal/worker.js'; // @feature temporal

(() => {
	logger.info('Worker started');
	void Workers.example.run(); // @feature queue
	// @feature:start temporal
	// Temporal handles SIGINT/SIGTERM itself: it stops polling and lets the
	// current tasks finish. Exit once it has, or open queue connections would
	// keep the process alive.
	createTemporalWorker()
		.then((worker) => worker.run())
		.then(() => process.exit(0))
		.catch((err: unknown) => {
			logger.fatal({ err }, 'Temporal worker failed');
			process.exit(1);
		});
	// @feature:end
})();
