export const PINO_CONSOLE_TARGET = {
	target: 'pino-pretty',
	options: {
		ignore: 'pid,hostname',
		translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
		singleLine: true,
		colorize: true
	}
};

export const PINO_FILE_TARGET = {
	target: 'pino/file',
	options: {
		destination: 'logs/app.log',
		mkdir: true
	}
};

export const PINO_CONSOLE_TARGET_PROD = {
	target: 'pino/file',
	options: {
		destination: 1
	}
};
