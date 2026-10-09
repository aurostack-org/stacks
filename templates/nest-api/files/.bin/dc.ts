import { Argv } from './helpers';

/**
 * Compose services that `up` / `recreate` bring online. Redis is only a service
 * when the cache feature is kept, so the list is assembled here rather than
 * being spelled out in four command strings.
 */
const SERVICES = [
	'database',
	'redis' // @feature cache
].join(' ');

// A project name unique to this API: a shared `-p test` makes compose adopt
// another project's test containers and their data volumes.
const TEST = 'docker compose -f compose.test.yml -p acme-test';

class DockerCompose extends Argv {
	private async getArgs() {
		const argv = await this.args.option('command', {
			type: 'string',
			description: 'Specify the docker-compose command to run',
			choices: ['up', 'wait', 'down', 'recreate'],
			demandOption: true,
			alias: 'c'
		}).argv;
		return {
			cmd: argv.command,
			env: this.getEnv(argv.env)
		};
	}

	private async getCommand(): Promise<string | undefined> {
		const { cmd, env } = await this.getArgs();
		if (env === 'dev') {
			if (cmd === 'up') return `docker compose up -d ${SERVICES}`;
			if (cmd === 'wait') return 'docker compose run --rm wait';
			if (cmd === 'down') return 'docker compose down';
			if (cmd === 'recreate')
				return `docker compose down && docker compose up -d ${SERVICES} && docker compose run --rm wait`;

			return undefined;
		}

		if (env === 'test') {
			if (cmd === 'up') return `${TEST} up -d ${SERVICES}`;
			if (cmd === 'wait') return `${TEST} run --rm wait`;
			if (cmd === 'down') return `${TEST} down`;
			if (cmd === 'recreate')
				return `${TEST} down && ${TEST} up -d ${SERVICES} && ${TEST} run --rm wait`;

			return undefined;
		}

		return undefined;
	}

	async run() {
		this.clear();
		const command = await this.getCommand();
		if (!command) {
			this.err(
				`The command is ONLY implemented for the development and test environments.`
			);
			return;
		}
		this.exec(command);
	}

	static init() {
		return new DockerCompose();
	}
}

DockerCompose.init()
	.run()
	.catch((e) => console.error(e.message));
