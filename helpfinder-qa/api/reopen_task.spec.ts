
import { apiClient, createTestUser } from './utils/api-client'

describe('Task Reopening Logic', () => {
    let requester: { token: string; userId: string; email: string }
    let helper: { token: string; userId: string; email: string }
    let taskId: string
    let bidId: string

    beforeAll(async () => {
        requester = await createTestUser('REQUESTER')
        helper = await createTestUser('HELPER')
    })

    const setupCompletedTask = async () => {
        // 1. Create
        const taskRes = await apiClient.post('/tasks', {
            title: 'Reopenable Task',
            description: 'Testing reopen logic',
            category: 'General',
            budgetMin: 50,
            budgetMax: 100,
            latitude: 10,
            longitude: 10,
            address: '123 Reopen St',
            country: 'Testland',
            zipCode: '12345'
        }, {
            headers: { Authorization: `Bearer ${requester.token}` }
        })
        taskId = taskRes.data.id

        // 2. Bid
        const bidRes = await apiClient.post(`/tasks/${taskId}/bids`, {
            amount: 75,
            message: 'Bid'
        }, {
            headers: { Authorization: `Bearer ${helper.token}` }
        })
        bidId = bidRes.data.id

        // 3. Accept
        await apiClient.post(`/bids/${bidId}/accept`, {}, {
            headers: { Authorization: `Bearer ${requester.token}` }
        })

        // 4. Start (Helper)
        await apiClient.post(`/tasks/${taskId}/start`, {}, {
            headers: { Authorization: `Bearer ${helper.token}` }
        })

        // 5. Request Completion (Helper)
        await apiClient.post(`/tasks/${taskId}/complete-request`, {}, {
            headers: { Authorization: `Bearer ${helper.token}` }
        })

        // 6. Approve (Requester)
        await apiClient.post(`/tasks/${taskId}/complete-approve`, {}, {
            headers: { Authorization: `Bearer ${requester.token}` }
        })

        // Verify it is completed
        const check = await apiClient.get(`/tasks/${taskId}`, { headers: { Authorization: `Bearer ${requester.token}` } })
        expect(check.data.status).toBe('completed')
    }

    it('should allow Requester to REOPEN a completed task', async () => {
        await setupCompletedTask()

        // Reopen
        const res = await apiClient.post(`/tasks/${taskId}/reopen`, {}, {
            headers: { Authorization: `Bearer ${requester.token}` }
        })

        expect(res.status).toBe(201)
        expect(res.data.status).toBe('open')
        expect(res.data.completedAt).toBeNull()

        // Verify side effects (Bid Rejected)
        const taskCheck = await apiClient.get(`/tasks/${taskId}`, { headers: { Authorization: `Bearer ${requester.token}` } })
        const bids = taskCheck.data.bids
        const oldBid = bids.find((b: any) => b.id === bidId)
        expect(oldBid.status).toBe('rejected')
    })

    it('should NOT allow Helper to Reopen', async () => {
        await setupCompletedTask()

        const res = await apiClient.post(`/tasks/${taskId}/reopen`, {}, {
            headers: { Authorization: `Bearer ${helper.token}` }
        })
        expect(res.status).toBe(403)
    })

    it('should NOT allow Reopening if task is NOT completed', async () => {
        // Create fresh task (status: open)
        const taskRes = await apiClient.post('/tasks', {
            title: 'Fresh Task',
            description: '...',
            category: 'General',
            budgetMin: 50, budgetMax: 100,
            latitude: 10, longitude: 10, address: 'X', country: 'Y', zipCode: 'Z'
        }, { headers: { Authorization: `Bearer ${requester.token}` } })

        const freshId = taskRes.data.id

        const res = await apiClient.post(`/tasks/${freshId}/reopen`, {}, {
            headers: { Authorization: `Bearer ${requester.token}` }
        })

        // Expect 400 Bad Request
        expect(res.status).toBe(400)
    })
})
