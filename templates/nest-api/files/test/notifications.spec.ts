import { AppFactory } from '@test/factory/app';
import { TEST_ADMIN, TEST_USER } from '@test/factory/constants';

describe('Notifications', () => {
	let app: AppFactory;
	let userCookie: string;
	let adminCookie: string;
	let userId: string;

	// TEST_USER owns the content; TEST_ADMIN acts on it to generate the alerts.
	const createPost = (cookie: string) =>
		app.request.post('/v1/posts').set('Cookie', cookie).send({
			type: 'question',
			title: 'How is dividend withholding tax handled on the GSE?',
			body: 'Is the 8% automatic or do I file it myself?'
		});

	const comment = (cookie: string, postId: string, body?: object) =>
		app.request
			.post(`/v1/posts/${postId}/comments`)
			.set('Cookie', cookie)
			.send({ body: 'The registrar deducts it at source.', ...body });

	const votePost = (cookie: string, postId: string, value: 1 | -1) =>
		app.request
			.post(`/v1/posts/${postId}/vote`)
			.set('Cookie', cookie)
			.send({ value });

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

	describe('generation from forum activity', () => {
		it('notifies the post author when someone comments', async () => {
			const post = await createPost(userCookie);
			await comment(adminCookie, post.body.id);

			const response = await listNotifications(userCookie);
			expect(response.status).toBe(200);
			expect(response.body.total).toBe(1);
			expect(response.body.list[0]).toMatchObject({
				userId,
				type: 'comment',
				readAt: null,
				data: { postId: post.body.id }
			});
			expect(response.body.list[0].data.commentId).toEqual(expect.any(String));
		});

		it('notifies the parent-comment author when someone replies', async () => {
			const post = await createPost(adminCookie);
			// TEST_USER leaves a top-level comment; admin replies to it.
			const parent = await comment(userCookie, post.body.id);
			await comment(adminCookie, post.body.id, { parentId: parent.body.id });

			const response = await listNotifications(userCookie);
			const reply = response.body.list.find(
				(n: { type: string }) => n.type === 'reply'
			);
			// `commentId` points at the reply itself (for deep-linking), not the parent.
			expect(reply).toMatchObject({
				userId,
				type: 'reply',
				data: { postId: post.body.id }
			});
			expect(reply.data.commentId).toEqual(expect.any(String));
			expect(reply.data.commentId).not.toBe(parent.body.id);
		});

		it('notifies the post author on an upvote', async () => {
			const post = await createPost(userCookie);
			await votePost(adminCookie, post.body.id, 1);

			const response = await listNotifications(userCookie, '?unread=true');
			const upvote = response.body.list.find(
				(n: { type: string }) => n.type === 'upvote'
			);
			expect(upvote).toMatchObject({
				type: 'upvote',
				data: { target: 'post', postId: post.body.id }
			});
		});

		it('does not notify you about your own comment', async () => {
			const post = await createPost(userCookie);
			await comment(userCookie, post.body.id);

			const response = await listNotifications(userCookie);
			expect(response.body.total).toBe(0);
		});

		it('does not notify you about your own upvote', async () => {
			const post = await createPost(userCookie);
			await votePost(userCookie, post.body.id, 1);

			const response = await listNotifications(userCookie);
			expect(response.body.total).toBe(0);
		});

		it('does not notify on a downvote', async () => {
			const post = await createPost(userCookie);
			await votePost(adminCookie, post.body.id, -1);

			const response = await listNotifications(userCookie);
			expect(response.body.total).toBe(0);
		});
	});

	describe('GET /v1/notifications/unread-count', () => {
		it('counts only unread notifications', async () => {
			const post = await createPost(userCookie);
			await comment(adminCookie, post.body.id);
			await votePost(adminCookie, post.body.id, 1);

			const response = await unreadCount(userCookie);
			expect(response.status).toBe(200);
			expect(response.body.count).toBe(2);
		});
	});

	describe('PATCH /v1/notifications/:id/read', () => {
		it('marks a single notification read and drops the unread count', async () => {
			const post = await createPost(userCookie);
			await comment(adminCookie, post.body.id);
			const { body: list } = await listNotifications(userCookie);
			const id = list.list[0].id;

			const read = await app.request
				.patch(`/v1/notifications/${id}/read`)
				.set('Cookie', userCookie);
			expect(read.status).toBe(200);
			expect(read.body.readAt).toEqual(expect.any(String));

			const count = await unreadCount(userCookie);
			expect(count.body.count).toBe(0);
		});

		it("404s when marking another user's notification", async () => {
			const post = await createPost(userCookie);
			await comment(adminCookie, post.body.id);
			const { body: list } = await listNotifications(userCookie);
			const id = list.list[0].id;

			// Admin has no such notification — it belongs to TEST_USER.
			const response = await app.request
				.patch(`/v1/notifications/${id}/read`)
				.set('Cookie', adminCookie);
			expect(response.status).toBe(404);
		});
	});

	describe('POST /v1/notifications/read-all', () => {
		it('marks every notification read', async () => {
			const post = await createPost(userCookie);
			await comment(adminCookie, post.body.id);
			await votePost(adminCookie, post.body.id, 1);

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
