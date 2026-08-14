import { Argv, Env } from './helpers.js';

interface ArgsResponse {
	cmd: string;
	env: Env;
	name?: string;
}

class CommandBuilder {
	private command: string[];

	private constructor(private env: Env = 'dev') {
		if (env === 'prod') {
			this.command = ['dotenv -e .env.production --', 'prisma'];
		} else if (env === 'test') {
			this.command = ['dotenv -e .env.test --', 'prisma'];
		} else {
			this.command = ['prisma'];
		}
	}

	static init(env: Env) {
		return new CommandBuilder(env);
	}

	generate() {
		this.command.push('generate');
		return this;
	}

	push() {
		// push targets test/prod (reseeded), so accept column drops non-interactively.
		this.command.push('db push --accept-data-loss');
		return this;
	}

	reset() {
		this.command.push('migrate reset --force');
		return this;
	}

	studio() {
		this.command.push('studio --browser none --port 5025');
		return this;
	}

	seed() {
		this.command.push('db seed');
		return this;
	}

	build() {
		return this.command.join(' ');
	}
}

class Database extends Argv {
	private async getArgs(): Promise<ArgsResponse> {
		const argv = await this.args
			.option('command', {
				type: 'string',
				description: 'Specify the command to run',
				choices: ['generate', 'push', 'seed', 'reset', 'studio'],
				default: 'generate',
				alias: 'c'
			})
			.option('name', {
				type: 'string',
				description:
					'Use a specific name for the migration (only for migrate or migrate:create command)',
				alias: 'n'
			}).argv;
		return {
			cmd: argv.command,
			env: this.getEnv(argv.env),
			name: argv.name
		};
	}

	private async getCommand() {
		const { env, cmd, name } = await this.getArgs();
		const command = CommandBuilder.init(env);
		if (cmd === 'push') {
			return command.push().build();
		}

		if (cmd === 'seed') {
			return command.seed().build();
		}

		if (cmd === 'reset') {
			if (['test', 'prod'].includes(env)) {
				this.err(
					'Reset command is not allowed in test or production environment'
				);
			}
			return command.reset().build();
		}

		if (cmd === 'studio') {
			if (env === 'prod') {
				this.err('Studio command is not allowed in production environment');
			}
			return command.studio().build();
		}

		return command.generate().build();
	}

	async run() {
		this.clear();
		const command = await this.getCommand();
		this.exec(command);
	}

	static init() {
		return new Database();
	}
}

Database.init()
	.run()
	.catch((e) => console.error(e.message));
