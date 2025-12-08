import { authenticatedClient, createTestUser } from './utils/api-client';

describe('Tasks API', () => {
    let requesterCtx: { token: string; userId: string };
    let helperCtx: { token: string; userId: string };
    let taskId: string;

    beforeAll(async () => {
        requesterCtx = await createTestUser('REQUESTER');
        helperCtx = await createTestUser('HELPER');
    }, 60000);

    it('should create a task successfully', async () => {
        const client = authenticatedClient(requesterCtx.token);
        const taskPayload = {
            title: 'Test Task for QA',
            description: 'This is a test task created by automated QA',
            budgetMin: 50,
            budgetMax: 100,
            latitude: 40.7128,
            longitude: -74.0060,
            address: '123 Test St',
            country: 'Country',
            zipCode: '12345'
        };

        const res = await client.post('/tasks', taskPayload);
        expect(res.status).toBe(201);
        expect(res.data.id).toBeDefined();
        taskId = res.data.id;
    });

    it('should allow helper to bid on the task', async () => {
        if (!taskId) return;
        const client = authenticatedClient(helperCtx.token);
        const bidPayload = {
            amount: 45,
            message: 'I can do this!',
        };

        const res = await client.post(`/tasks/${taskId}/bids`, bidPayload);
        expect(res.status).toBe(201);
        expect(res.data.id).toBeDefined();
    });

    it('should not allow editing task after acceptance', async () => {
        if (!taskId) return;

        const clientReq = authenticatedClient(requesterCtx.token);

        // Get bids
        const bidsRes = await clientReq.get(`/tasks/${taskId}/bids`);

        const bid = bidsRes.data.find((b: any) => b.helper.id === helperCtx.userId);

        if (!bid) {
            throw new Error('Bid not found to accept');
        }

        // Accept
        const acceptRes = await clientReq.post(`/bids/${bid.id}/accept`, {});
        expect(acceptRes.status).toBe(201);

        // Edit
        const updateRes = await clientReq.patch(`/tasks/${taskId}`, {
            title: 'Malicious Update'
        });
        expect(updateRes.status).toBe(403);
    });
});
