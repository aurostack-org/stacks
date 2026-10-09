import { Test, TestingModule } from '@nestjs/testing';
import { CustomConfigService, TemporalService, temporalTls } from 'common/services';

const tls = { ca: '', cert: '', key: '' };

describe('TemporalService', () => {
	let service: TemporalService;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TemporalService,
				{
					provide: CustomConfigService,
					useValue: {
						temporal: {
							address: 'localhost:7233',
							namespace: 'acme',
							taskQueue: 'main',
							tls
						}
					}
				}
			]
		}).compile();

		service = module.get(TemporalService);
	});

	it('builds a client for the configured namespace without connecting', () => {
		expect(service.client.options.namespace).toBe('acme');
		expect(service.taskQueue).toBe('main');
	});

	it('closes cleanly even if it never connected', async () => {
		await expect(service.onApplicationShutdown()).resolves.toBeUndefined();
	});
});

describe('temporalTls', () => {
	const cert = '-----BEGIN CERTIFICATE-----\\nMIIB\\n-----END CERTIFICATE-----';
	const key = '-----BEGIN PRIVATE KEY-----\\nMIGH\\n-----END PRIVATE KEY-----';

	it('is plaintext when nothing is set', () => {
		expect(temporalTls(tls)).toBeNull();
	});

	it('builds a client certificate pair, unescaping one-line PEM', () => {
		const result = temporalTls({ ca: cert, cert, key });
		expect(result?.clientCertPair?.crt.toString()).toBe(
			'-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----'
		);
		expect(result?.clientCertPair?.key.toString()).toContain('\nMIGH\n');
		expect(result?.serverRootCACertificate?.toString()).toContain('\nMIIB\n');
	});

	it('omits the CA when only the client pair is set (publicly trusted server)', () => {
		const result = temporalTls({ ca: '', cert, key });
		expect(result?.serverRootCACertificate).toBeUndefined();
		expect(result?.clientCertPair).toBeDefined();
	});

	it('rejects a certificate without its key', () => {
		expect(() => temporalTls({ ...tls, cert })).toThrow(/set together/);
	});
});
