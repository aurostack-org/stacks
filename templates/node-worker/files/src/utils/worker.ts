import { Worker, type WorkerOptions, type Processor } from 'bullmq';
import config from '#app/config.js';

export const createWorker = <
	DataType = unknown,
	ResultType = unknown,
	NameType extends string = string
>(
	name: string,
	processor: Processor<DataType, ResultType, NameType>,
	opts?: Omit<WorkerOptions, 'connection' | 'concurrency' | 'autorun'>
) => {
	const connection = {
		host: config.redis.host,
		port: config.redis.port,
		user: config.redis.user,
		password: config.redis.password
	};

	const defaultOptions = {
		concurrency: 1,
		autorun: false
	};

	const options = !opts
		? { connection, ...defaultOptions }
		: { connection, ...defaultOptions, ...opts };
	return new Worker(name, processor, options);
};
