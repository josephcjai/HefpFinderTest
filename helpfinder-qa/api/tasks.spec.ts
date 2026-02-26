import { authenticatedClient, createTestUser } from './utils/api-client';

describe('Cancel Bids API', () => {
    let requesterCtx: { token: string; userId: string };
    let helperCtx: { token: string; userId: string };
    let taskId: string;
    let bidId: string;

    beforeAll(async () => {
        requesterCtx = await createTestUser('REQUESTER');
        helperCtx = await createTestUser('HELPER');
    }, 60000);

    it('setup: should create a task and place a bid', async () => {
        const reqClient = authenticatedClient(requesterCtx.token);
        const helperClient = authenticatedClient(helperCtx.token);

        // Create task
        const taskRes = await reqClient.post('/tasks', {
            title: 'Cancel Bid Test Task',
            description: 'Testing bid cancellation',
            budgetMin: 50,
            budgetMax: 100,
            latitude: 40.7128,
            longitude: -74.0060,
            address: '123 Test St',
            country: 'Country',
            zipCode: '12345'
        });
        expect(taskRes.status).toBe(201);
        taskId = taskRes.data.id;

        // Place bid
        const bidRes = await helperClient.post(`/tasks/${taskId}/bids`, {
            amount: 75,
            message: 'I will do it'
        });
        expect(bidRes.status).toBe(201);
        bidId = bidRes.data.id;
    });

    it('should allow helper to withdraw (cancel) their bid', async () => {
        if (!bidId) return;
        const helperClient = authenticatedClient(helperCtx.token);

        const res = await helperClient.delete(`/bids/${bidId}`);
        // Expect 200 or 204 depending on implementation
        expect([200, 201, 204]).toContain(res.status);
    });

    it('should confirm the withdrawn bid no longer appears in the task bids', async () => {
        if (!taskId) return;
        const reqClient = authenticatedClient(requesterCtx.token);

        const bidsRes = await reqClient.get(`/tasks/${taskId}/bids`);
        expect(bidsRes.status).toBe(200);
        const stillExists = bidsRes.data.find((b: any) => b.id === bidId);
        expect(stillExists).toBeUndefined();
    });
});

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
