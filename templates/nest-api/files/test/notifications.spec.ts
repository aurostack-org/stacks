import { AppFactory } from '@test/factory/app';
import { TEST_ADMIN, TEST_USER } from '@test/factory/constants';
import { NotificationsService } from 'notifications/services/notifications.service';

describe('Notifications', () => {
	let app: AppFactory;
	let userCookie: string;
	let adminCookie: string;
	let userId: string;

	// Seed through the service's write side — the same call other modules make —
	// so these specs exercise the endpoints without depending on any producer.
	const dispatch = (recipientId = userId, data: object = { message: 'Hi' }) =>
		app.instance.get(NotificationsService).dispatch(recipientId, 'system', data);

	const listNotifications = (cookie: string, query = '') =>
		app.request.get(`/v1/notifications${query}`).set('Cookie', cookie);

	const unreadCount = (cookie: string) =>
		app.request.get('/v1/notifications/unread-count').set('Cookie', cookie);

	beforeAll(async () => {
		app = await AppFactory.init();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(async () => {
		await app.refresh();
		userCookie = (await app.signIn(TEST_USER.email, TEST_USER.password))
			.cookie!;
		adminCookie = (await app.signIn(TEST_ADMIN.email, TEST_ADMIN.password))
			.cookie!;
		const session = await app.request
			.get('/auth/get-session')
			.set('Cookie', userCookie);
		userId = session.body.user.id;
	});

	describe('OpenAPI', () => {
		it('lists the notification routes in /openapi-json', async () => {
			const response = await app.request.get('/openapi-json');
			expect(response.status).toBe(200);
			const paths = Object.keys(response.body.paths ?? {});
			expect(paths).toEqual(
				expect.arrayContaining([
					'/v1/notifications',
					'/v1/notifications/unread-count',
					'/v1/notifications/{id}/read',
					'/v1/notifications/read-all'
				])
			);
		});
	});

	describe('GET /v1/notifications', () => {
		it('rejects unauthenticated requests with 401', async () => {
			const response = await listNotifications('');
			expect(response.status).toBe(401);
		});

		it('starts empty for a fresh user', async () => {
			const response = await listNotifications(userCookie);
			expect(response.status).toBe(200);
			expect(response.body.list).toEqual([]);
			expect(response.body.total).toBe(0);
		});
	});

	describe('dispatch', () => {
		it('lists a dispatched notification for its recipient', async () => {
			await dispatch(userId, { message: 'Welcome aboard' });

			const response = await listNotifications(userCookie);
			expect(response.status).toBe(200);
			expect(response.body.total).toBe(1);
			expect(response.body.list[0]).toMatchObject({
				userId,
				type: 'system',
				readAt: null,
				data: { message: 'Welcome aboard' }
			});
		});

		it("does not show one user's notifications to another", async () => {
			await dispatch();

			const response = await listNotifications(adminCookie);
			expect(response.body.total).toBe(0);
		});

		it('filters to unread with ?unread=true', async () => {
			const first = await dispatch();
			await dispatch();
			await app.request
				.patch(`/v1/notifications/${first!.id}/read`)
				.set('Cookie', userCookie);

			const response = await listNotifications(userCookie, '?unread=true');
			expect(response.body.total).toBe(1);
		});
	});

	describe('GET /v1/notifications/unread-count', () => {
		it('counts only unread notifications', async () => {
			const first = await dispatch();
			await dispatch();
			await dispatch();
			await app.request
				.patch(`/v1/notifications/${first!.id}/read`)
				.set('Cookie', userCookie);

			const response = await unreadCount(userCookie);
			expect(response.status).toBe(200);
			expect(response.body.count).toBe(2);
		});
	});

	describe('PATCH /v1/notifications/:id/read', () => {
		it('marks a single notification read and drops the unread count', async () => {
			const { id } = (await dispatch())!;

			const read = await app.request
				.patch(`/v1/notifications/${id}/read`)
				.set('Cookie', userCookie);
			expect(read.status).toBe(200);
			expect(read.body.readAt).toEqual(expect.any(String));

			const count = await unreadCount(userCookie);
			expect(count.body.count).toBe(0);
		});

		it("404s when marking another user's notification", async () => {
			const { id } = (await dispatch())!;

			// Admin has no such notification — it belongs to TEST_USER.
			const response = await app.request
				.patch(`/v1/notifications/${id}/read`)
				.set('Cookie', adminCookie);
			expect(response.status).toBe(404);
		});
	});

	describe('POST /v1/notifications/read-all', () => {
		it('marks every notification read', async () => {
			await dispatch();
			await dispatch();

			const response = await app.request
				.post('/v1/notifications/read-all')
				.set('Cookie', userCookie);
			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({ status: 200, message: 'ok' });

			const count = await unreadCount(userCookie);
			expect(count.body.count).toBe(0);

			const unread = await listNotifications(userCookie, '?unread=true');
			expect(unread.body.total).toBe(0);
		});
	});
});
