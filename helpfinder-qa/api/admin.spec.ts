
import { authenticatedClient, createTestUser, apiClient } from './utils/api-client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

describe('Admin & Super Admin Capability', () => {
    // Contexts to store generated user data
    let superUser: { token: string; userId: string; email: string; password: string };
    let victimUser: { token: string; userId: string; email: string; password: string };
    let candidateUser: { token: string; userId: string; email: string; password: string };

    // Helper to run seed script using the temp_analysis clone
    const runScript = async (scriptName: string, email: string) => {
        const projectRoot = path.resolve('../temp_analysis/services/api');

        // Inject DATABASE_URL which is what AppModule looks for
        // Use 127.0.0.1 to avoid localhost ambiguity
        const env = {
            ...process.env,
            DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/helpfinder_test'
        };

        // console.log(`Executing ${scriptName} in ${projectRoot} for ${email}`);
        try {
            const { stdout, stderr } = await execAsync(`npm run ${scriptName} -- ${email}`, { cwd: projectRoot, env });
            // console.log(`${scriptName} Output:`, stdout);
            if (stderr) {
                // console.error(`${scriptName} Stderr:`, stderr);
            }
        } catch (e: any) {
            console.error(`${scriptName} Failed in ${projectRoot}`);
            console.error('Message:', e.message);
            if (e.stdout) console.error('Stdout:', e.stdout);
            if (e.stderr) console.error('Stderr:', e.stderr);
            throw e;
        }
    };

    beforeAll(async () => {
        jest.setTimeout(30000); // Increase timeout for script setup

        // 1. Create users using the helper
        superUser = await createTestUser('REQUESTER');
        victimUser = await createTestUser('REQUESTER');
        candidateUser = await createTestUser('REQUESTER');

        // 2. Elevate the Super Admin using the script
        console.log(`Promoting ${superUser.email} to Super Admin via script...`);
        await runScript('seed:admin', superUser.email);

        // 3. REFRESH TOKEN to get Admin Role permissions
        const loginRes = await apiClient.post('/auth/login', {
            email: superUser.email,
            password: superUser.password
        });
        superUser.token = loginRes.data.access_token;
    });

    afterAll(async () => {
        // Cleanup: Demote the super admin so they don't persist as powerful
        if (superUser?.email) {
            await runScript('demote:admin', superUser.email);
        }
    });

    it('Super Admin should be able to VIEW all users', async () => {
        const res = await apiClient.get('/users', {
            headers: { Authorization: `Bearer ${superUser.token}` }
        });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data)).toBe(true);
        const emails = res.data.map((u: any) => u.email);
        expect(emails).toContain(victimUser.email);
    });

    it('Super Admin should be able to PROMOTE another user to Admin', async () => {
        const res = await apiClient.patch(`/users/${candidateUser.userId}/role`, {
            role: 'admin'
        }, {
            headers: { Authorization: `Bearer ${superUser.token}` }
        });
        expect(res.status).toBe(200);
        expect(res.data.role).toBe('admin');
    });

    it('Promoted Admin should be able to ACT as an Admin (View Users)', async () => {
        // 1. Logic as the new Admin
        const loginRes = await apiClient.post('/auth/login', {
            email: candidateUser.email,
            password: candidateUser.password
        });
        const adminToken = loginRes.data.access_token;

        // 2. Try to view users (Admin-only endpoint)
        const res = await apiClient.get('/users', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data)).toBe(true);
    });

    it('Super Admin should be able to DEMOTE an Admin back to User', async () => {
        const res = await apiClient.patch(`/users/${candidateUser.userId}/role`, {
            role: 'user'
        }, {
            headers: { Authorization: `Bearer ${superUser.token}` }
        });
        expect(res.status).toBe(200);
        expect(res.data.role).toBe('user');

        // Verify they lost access
        const loginRes = await apiClient.post('/auth/login', {
            email: candidateUser.email,
            password: candidateUser.password
        });
        const userToken = loginRes.data.access_token;

        const checkRes = await apiClient.get('/users', {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        expect(checkRes.status).toBe(403);
    });

    it('Super Admin should NOT be able to DEMOTE themselves (Safety Check)', async () => {
        const res = await apiClient.patch(`/users/${superUser.userId}/role`, {
            role: 'user'
        }, {
            headers: { Authorization: `Bearer ${superUser.token}` }
        });

        // Expect 403 Forbidden
        expect(res.status).toBe(403);
    });

    it('Super Admin should NOT be able to DELETE themselves (Safety Check)', async () => {
        const res = await apiClient.delete(`/users/${superUser.userId}`, {
            headers: { Authorization: `Bearer ${superUser.token}` }
        });

        // Expect 403 Forbidden or 400 Bad Request
        expect([400, 403]).toContain(res.status);
    });

    it('Super Admin should be able to DELETE another user', async () => {
        const res = await apiClient.delete(`/users/${victimUser.userId}`, {
            headers: { Authorization: `Bearer ${superUser.token}` }
        });
        expect(res.status).toBe(200);

        // Verify deletion
        const checkRes = await apiClient.get('/auth/profile', {
            headers: { Authorization: `Bearer ${victimUser.token}` }
        });
        // Should fail with 401 (Unauthorized) or 404 (User Not Found)
        expect(checkRes.status).toBeGreaterThanOrEqual(400);
    });
});
