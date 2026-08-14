import pino, { stdTimeFunctions, levels } from 'pino';
import config from '#app/config.js';

const PINO_CONSOLE_TARGET = {
	target: 'pino-pretty',
	options: {
		ignore: 'pid,hostname',
		translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
		singleLine: true,
		colorize: true
	}
};

const PINO_FILE_TARGET = {
	target: 'pino/file',
	options: {
		destination: 'logs/collector.log',
		mkdir: true
	}
};

const PINO_CONSOLE_TARGET_PROD = {
	target: 'pino/file',
	options: {
		destination: 1
	}
};

const logger = pino({
	level: config.app.logLevel,
	transport:
		config.app.env === 'production'
			? { targets: [PINO_CONSOLE_TARGET_PROD, PINO_FILE_TARGET] }
			: { targets: [PINO_CONSOLE_TARGET, PINO_FILE_TARGET] },
	base: {
		service: 'collector',
		env: config.app.env
	},
	timestamp: stdTimeFunctions.isoTime,
	mixin(_mergeObject, level) {
		return { levelLabel: levels.labels[level] };
	}
});

export default logger;
