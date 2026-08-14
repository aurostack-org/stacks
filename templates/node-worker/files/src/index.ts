import logger from '#app/logger.js';
import * as Workers from '#app/workers/index.js'; // @feature queue

(() => {
	logger.info('Worker started');
	void Workers.example.run(); // @feature queue
})();
