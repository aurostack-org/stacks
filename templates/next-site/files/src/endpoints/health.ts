import type { Endpoint } from 'payload';

/**
 * GET /api/health: 200 when the server is up and Postgres answers, 503
 * otherwise. The Docker HEALTHCHECK and any load balancer poll this.
 */
export const health: Endpoint = {
	path: '/health',
	method: 'get',
	handler: async (req) => {
		try {
			await req.payload.count({ collection: 'users', overrideAccess: true, req });
			return Response.json({ status: 'ok' });
		} catch (err) {
			req.payload.logger.error({ err, msg: 'Health check failed' });
			return Response.json({ status: 'error' }, { status: 503 });
		}
	}
};
