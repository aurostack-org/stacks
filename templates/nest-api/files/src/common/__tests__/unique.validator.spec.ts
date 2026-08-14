import { TestBed, type Mocked } from '@suites/unit';
import { Factory } from 'fishery';
import { Gen } from '@test/factory/gen';
import { UniqueValidator } from 'common/validators';
import { PrismaService } from 'common/services';
import { CustomValidationArguments } from 'common/types';

/**
 * For mocking unique validator arguments
 */
const ArgFactory = Factory.define<CustomValidationArguments>(() => ({
	constraints: ['user', undefined],
	value: '',
	object: {},
	targetName: '',
	property: ''
}));

describe('UniqueValidator', () => {
	let validator: UniqueValidator;
	let db: Mocked<PrismaService>;

	beforeAll(async () => {
		const { unit, unitRef } = await TestBed.solitary(UniqueValidator).compile();
		validator = unit;
		db = unitRef.get(PrismaService);
	});

	it('should be defined', () => {
		expect(validator).toBeDefined();
	});

	describe('User', () => {
		describe('EMAIL', () => {
			let arg: CustomValidationArguments;

			beforeEach(() => {
				arg = ArgFactory.build({
					constraints: ['user', undefined],
					property: 'email',
					value: Gen.email()
				});
			});

			describe('when exists', () => {
				it('should return false', async () => {
					db.x.user.exists.mockResolvedValue(true);

					const result = await validator.validate(arg.value, arg);
					expect(result).toBe(false);
				});
			});

			describe('otherwise', () => {
				it('should return true', async () => {
					db.x.user.exists.mockResolvedValue(false);

					const result = await validator.validate(arg.value, arg);
					expect(result).toBe(true);
				});
			});
		});

		describe('USERNAME', () => {
			let arg: CustomValidationArguments;

			beforeEach(() => {
				arg = ArgFactory.build({
					constraints: ['user', undefined],
					property: 'username',
					value: Gen.username()
				});
			});

			describe('when exists', () => {
				it('should return false', async () => {
					db.x.user.exists.mockResolvedValue(true);

					const result = await validator.validate(arg.value, arg);
					expect(result).toBe(false);
				});
			});

			describe('otherwise', () => {
				it('should return true', async () => {
					db.x.user.exists.mockResolvedValue(false);

					const result = await validator.validate(arg.value, arg);
					expect(result).toBe(true);
				});
			});
		});
	});
});
