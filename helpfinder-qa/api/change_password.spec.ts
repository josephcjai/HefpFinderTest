import { authenticatedClient, createTestUser } from './utils/api-client'

describe('Change Password API', () => {
    let testUser: { token: string; userId: string; email: string }

    beforeAll(async () => {
        testUser = await createTestUser('REQUESTER')
    })

    it('should reject password update if current password is wrong', async () => {
        const client = authenticatedClient(testUser.token)
        const res = await client.patch('/users/me/password', {
            currentPassword: 'WrongPassword123!',
            newPassword: 'NewStrongPassword123!'
        })
        expect(res.status).toBeGreaterThanOrEqual(400)
        expect(res.status).toBeLessThan(500)
    })

    it('should reject password update if new password is too short', async () => {
        const client = authenticatedClient(testUser.token)
        const res = await client.patch('/users/me/password', {
            currentPassword: 'password123',
            newPassword: '123'
        })
        expect(res.status).toBeGreaterThanOrEqual(400)
        expect(res.status).toBeLessThan(500)
    })

    it('should successfully update password with valid inputs', async () => {
        const client = authenticatedClient(testUser.token)
        const res = await client.patch('/users/me/password', {
            currentPassword: 'password123',
            newPassword: 'NewStrongPassword123!'
        })
        expect(res.status).toBe(200)

        // Verify that the new password works by logging in again
        const loginRes = await authenticatedClient('').post('/auth/login', {
            email: testUser.email,
            password: 'NewStrongPassword123!'
        })
        expect(loginRes.status).toBe(201)
        expect(loginRes.data.access_token).toBeDefined()
    })
})
