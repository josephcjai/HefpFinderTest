import { authenticatedClient, createTestUser } from './utils/api-client';

describe('Reviews API', () => {
    let requesterCtx: { token: string; userId: string };
    let helperCtx: { token: string; userId: string };
    let taskId: string;

    beforeAll(async () => {
        requesterCtx = await createTestUser('REQUESTER');
        helperCtx = await createTestUser('HELPER');
    }, 60000);

    it('setup: should create a task, place bid and accept it', async () => {
        const reqClient = authenticatedClient(requesterCtx.token);
        const helperClient = authenticatedClient(helperCtx.token);

        // 1. Requester Creates Task
        const taskPayload = {
            title: 'Review Test Task',
            description: 'Task to be reviewed',
            budgetMin: 50,
            budgetMax: 100,
            latitude: 40.7128,
            longitude: -74.0060,
            address: '123 Test St',
            country: 'Country',
            zipCode: '12345'
        };

        let res = await reqClient.post('/tasks', taskPayload);
        expect(res.status).toBe(201);
        taskId = res.data.id;

        // 2. Helper Bids
        res = await helperClient.post(`/tasks/${taskId}/bids`, { amount: 75, message: 'I will do it' });
        expect(res.status).toBe(201);
        const bidId = res.data.id;

        // 3. Requester Accepts
        res = await reqClient.post(`/bids/${bidId}/accept`, {});
        expect(res.status).toBe(201);

        // 4. Helper Starts the Task
        res = await helperClient.post(`/tasks/${taskId}/start`, {});
        expect(res.status).toBe(201); // or 200 depending on framework

        // 5. Helper Requests Completion
        res = await helperClient.post(`/tasks/${taskId}/complete-request`, {});
        expect(res.status).toBe(201);

        // 6. Requester Approves Completion
        res = await reqClient.post(`/tasks/${taskId}/complete-approve`, {});
        expect(res.status).toBe(201);
    });

    it('should allow requester to review the helper', async () => {
        if (!taskId) return;
        const client = authenticatedClient(requesterCtx.token);

        const reviewPayload = {
            taskId: taskId,
            targetUserId: helperCtx.userId,
            targetRole: 'helper',
            rating: 5,
            comment: 'Great helper!'
        };

        const res = await client.post('/reviews', reviewPayload);
        if (res.status !== 201) console.log('Requester Review Failed:', res.data);
        expect(res.status).toBe(201);
        expect(res.data.id).toBeDefined();
    });

    it('should allow helper to review the requester', async () => {
        if (!taskId) return;
        const client = authenticatedClient(helperCtx.token);

        const reviewPayload = {
            taskId: taskId,
            targetUserId: requesterCtx.userId,
            targetRole: 'requester',
            rating: 4,
            comment: 'Good requester, paid on time.'
        };

        const res = await client.post('/reviews', reviewPayload);
        if (res.status !== 201) console.log('Helper Review Failed:', res.data);
        expect(res.status).toBe(201);
        expect(res.data.id).toBeDefined();
    });

    it('should retrieve reviews for a user', async () => {
        const client = authenticatedClient(requesterCtx.token);

        const res = await client.get(`/reviews/user/${helperCtx.userId}?role=helper`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data)).toBe(true);
        expect(res.data.length).toBeGreaterThanOrEqual(1);
        expect(res.data[0].rating).toBe(5);
        expect(res.data[0].comment).toBe('Great helper!');
    });

    it('should retrieve reviews for a task', async () => {
        const client = authenticatedClient(requesterCtx.token);

        const res = await client.get(`/reviews/task/${taskId}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data)).toBe(true);
        expect(res.data.length).toBeGreaterThanOrEqual(2);
    });
});
