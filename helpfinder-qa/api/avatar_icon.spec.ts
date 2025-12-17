
import { apiClient, createTestUser } from './utils/api-client'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execAsync = promisify(exec)

describe('Avatar & Icon Features', () => {
    let user: { token: string; userId: string; email: string }
    let admin: { token: string; userId: string; email: string }

    const runScript = async (scriptName: string, email: string) => {
        const projectRoot = path.resolve('../temp_analysis/services/api')
        const env = {
            ...process.env,
            DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/helpfinder_test'
        }
        await execAsync(`npm run ${scriptName} -- ${email}`, { cwd: projectRoot, env })
    }

    beforeAll(async () => {
        user = await createTestUser('REQUESTER')

        // Create Admin
        const adminUser = await createTestUser('REQUESTER')
        await runScript('seed:admin', adminUser.email)

        // Re-login to get Admin Token
        const loginRes = await apiClient.post('/auth/login', {
            email: adminUser.email,
            password: adminUser.password
        })
        admin = {
            ...adminUser,
            token: loginRes.data.access_token
        }
    })

    describe('User Avatar', () => {
        it('should allow user to update their Avatar Profile', async () => {
            const updates = {
                avatarIcon: 'user-secret',
                avatarInitials: 'JD',
                avatarColor: '#ff0000',
                address: '123 Avatar Way',
                country: 'Digital World'
            }

            const res = await apiClient.patch('/auth/profile', updates, {
                headers: { Authorization: `Bearer ${user.token}` }
            })

            expect(res.status).toBe(200)
            expect(res.data.avatarIcon).toBe('user-secret')
            expect(res.data.avatarInitials).toBe('JD')
            expect(res.data.avatarColor).toBe('#ff0000')
            expect(res.data.address).toBe('123 Avatar Way')
        })
    })

    describe('Category Icons (Admin)', () => {
        let categoryId: string

        it('should allow Admin to create category with Icon', async () => {
            const res = await apiClient.post('/categories', {
                name: 'Tech Support',
                icon: 'laptop',
                color: 'blue'
            }, {
                headers: { Authorization: `Bearer ${admin.token}` }
            })

            expect(res.status).toBe(201)
            categoryId = res.data.id
            expect(res.data.icon).toBe('laptop')
        })

        it('should allow Admin to UPDATE category Icon', async () => {
            const res = await apiClient.patch(`/categories/${categoryId}`, {
                name: 'Tech Support',
                icon: 'desktop', // Changed
                color: 'cyan'    // Changed
            }, {
                headers: { Authorization: `Bearer ${admin.token}` }
            })

            expect(res.status).toBe(200)
            expect(res.data.icon).toBe('desktop')
            expect(res.data.color).toBe('cyan')
        })
    })
})
