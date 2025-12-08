import { authenticatedClient, createTestUser } from './utils/api-client';

describe('Miscellaneous API', () => {
    let userCtx: { token: string; userId: string };

    beforeAll(async () => {
        userCtx = await createTestUser('REQUESTER');
    });

    it('should fetch categories', async () => {
        const client = authenticatedClient(userCtx.token);
        const res = await client.get('/categories');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data)).toBe(true);
        if (res.data.length > 0) {
            expect(res.data[0]).toHaveProperty('id');
            expect(res.data[0]).toHaveProperty('name');
        }
    });

    it('should fetch notifications', async () => {
        const client = authenticatedClient(userCtx.token);
        const res = await client.get('/notifications');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data)).toBe(true);
    });
});
