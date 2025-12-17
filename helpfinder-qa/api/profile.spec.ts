
import { apiClient, createTestUser } from './utils/api-client'

describe('Profile API', () => {
    let requester: { token: string; userId: string; email: string }
    let helper: { token: string; userId: string; email: string }

    beforeAll(async () => {
        requester = await createTestUser('REQUESTER')
        helper = await createTestUser('HELPER')
    })

    it('should retrieve MY CREATED tasks', async () => {
        // 1. Create a task as requester
        const taskRes = await apiClient.post('/tasks', {
            title: 'My Created Task',
            description: 'Testing my-created endpoint',
            category: 'General',
            budgetMin: 50,
            budgetMax: 100,
            latitude: 10,
            longitude: 10,
            address: '123 Test St',
            country: 'Testland',
            zipCode: '12345'
        }, {
            headers: { Authorization: `Bearer ${requester.token}` }
        })
        expect(taskRes.status).toBe(201)
        const taskId = taskRes.data.id

        // 2. Fetch my-created
        const res = await apiClient.get('/tasks/my-created', {
            headers: { Authorization: `Bearer ${requester.token}` }
        })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data)).toBe(true)
        const myTasks = res.data.map((t: any) => t.id)
        expect(myTasks).toContain(taskId)
    })

    it('should retrieve MY JOBS (Assigned Tasks)', async () => {
        // 1. Create task
        const taskRes = await apiClient.post('/tasks', {
            title: 'Job for Helper',
            description: 'Task to be assigned',
            category: 'General',
            budgetMin: 50,
            budgetMax: 100,
            latitude: 10,
            longitude: 10,
            address: '123 Job Ln',
            country: 'Jobland',
            zipCode: '99999'
        }, {
            headers: { Authorization: `Bearer ${requester.token}` }
        })
        const taskId = taskRes.data.id

        // 2. Helper Bids
        const bidRes = await apiClient.post(`/tasks/${taskId}/bids`, {
            amount: 75,
            message: 'I can do this'
        }, {
            headers: { Authorization: `Bearer ${helper.token}` }
        })
        const bidId = bidRes.data.id

        // 3. Requester Accepts
        await apiClient.post(`/bids/${bidId}/accept`, {}, {
            headers: { Authorization: `Bearer ${requester.token}` }
        })

        // 4. Fetch my-jobs as Helper
        const res = await apiClient.get('/tasks/my-jobs', {
            headers: { Authorization: `Bearer ${helper.token}` }
        })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data)).toBe(true)
        const myJobs = res.data.map((t: any) => t.id)
        expect(myJobs).toContain(taskId)
    })
})
