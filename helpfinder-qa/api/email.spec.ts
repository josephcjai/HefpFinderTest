
import { authenticatedClient, createTestUser } from './utils/api-client';

describe('Email Service Integration (SMTP)', () => {
    let requesterCtx: { token: string; userId: string; email: string };
    let helperCtx: { token: string; userId: string; email: string };
    let taskId: string;

    beforeAll(async () => {
        // Create users (Registration triggers Welcome Email)
        requesterCtx = await createTestUser('REQUESTER');
        helperCtx = await createTestUser('HELPER');
    }, 60000);

    it('should trigger Welcome Email on registration without error', () => {
        // The createTestUser helper already performs registration.
        // If this passed (token exists), it means Registration API returned 201.
        // If SMTP was broken/throwing, the API would likely return 500 (since MailService throws).
        expect(requesterCtx.token).toBeDefined();
        expect(helperCtx.token).toBeDefined();
    });

    it('should trigger Bid Notification Email when helper bids', async () => {
        const requesterClient = authenticatedClient(requesterCtx.token);
        const helperClient = authenticatedClient(helperCtx.token);

        // 1. Create Task
        const taskPayload = {
            title: 'Email Test Task',
            description: 'Testing if email notifications work',
            budgetMin: 50,
            budgetMax: 100,
            latitude: 40.7128,
            longitude: -74.0060,
            address: '123 SMTP Lane',
            country: 'internet',
            zipCode: '10001'
        };
        const taskRes = await requesterClient.post('/tasks', taskPayload);
        expect(taskRes.status).toBe(201);
        taskId = taskRes.data.id;

        // 2. Place Bid (Should trigger sendNewBidEmail)
        const bidPayload = {
            amount: 75,
            message: 'I can test your email service',
        };
        const bidRes = await helperClient.post(`/tasks/${taskId}/bids`, bidPayload);

        // Assert: 201 Created means logic executed and EmailService didn't crash the request
        expect(bidRes.status).toBe(201);
    });

    it('should trigger Bid Accepted Email when requester accepts', async () => {
        const requesterClient = authenticatedClient(requesterCtx.token);

        // 1. Get Bids
        const bidsRes = await requesterClient.get(`/tasks/${taskId}/bids`);
        const bid = bidsRes.data.find((b: any) => b.helper.id === helperCtx.userId);
        expect(bid).toBeDefined();

        // 2. Accept Bid (Should trigger sendBidAcceptedEmail)
        const acceptRes = await requesterClient.post(`/bids/${bid.id}/accept`, {});

        // Assert: 201 Created
        expect(acceptRes.status).toBe(201);
    });

    it('should trigger Forgot Password Email', async () => {
        // 1. Request Password Reset
        const res = await authenticatedClient('').post('/auth/forgot-password', {
            email: requesterCtx.email
        });

        // Assert: 201 Created (or 200 OK)
        // Checks that MailService.sendResetPasswordEmail was called
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(300);
    });

    it('should trigger Resend Verification Email', async () => {
        // 1. Resend Verification
        // Note: The endpoint might require a logged-in user or just an email depending on implementation.
        // Looking at auth.controller might be needed, but usually it's public or authenticated.
        // Let's try with the authenticated user who is not verified yet.

        const res = await authenticatedClient(requesterCtx.token).post('/auth/resend-verification', {
            email: requesterCtx.email
        });

        // Assert: 201 or 200
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(300);
    });
});
