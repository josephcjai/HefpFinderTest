import axios from 'axios';
import { Client } from 'pg';

const API_URL = process.env.API_URL || 'http://127.0.0.1:4001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/helpfinder_test';

export const apiClient = axios.create({
    baseURL: API_URL,
    validateStatus: () => true, // Don't throw on error status
});

export const authenticatedClient = (token: string) => {
    return axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
    });
};

export const createTestUser = async (role: 'REQUESTER' | 'HELPER') => {
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    const email = `test.${role.toLowerCase()}.${uniqueId}@example.com`;
    const password = 'password123';

    // AuthController expects 'name'
    const registerRes = await apiClient.post('/auth/register', {
        email,
        password,
        name: `Test ${role}`,
        role,
    });

    if (registerRes.status !== 201) {
        throw new Error(`Register failed: ${registerRes.status}`);
    }

    // Auto login/get token
    let token = registerRes.data.access_token;

    if (!token && registerRes.status === 201) {
        const loginRes = await apiClient.post('/auth/login', { email, password });
        token = loginRes.data.access_token;
        if (!token) throw new Error(`Login failed after register: ${loginRes.status}`);
    }

    // Connect to DB and force the role
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    // Auth profile response needs user id
    let userId = registerRes.data.id;
    if (!userId && token) {
        const profileRes = await authenticatedClient(token).get('/auth/profile');
        userId = profileRes.data.id || profileRes.data.sub;
    }

    if (userId) {
        await client.query('UPDATE "users" SET role = $1 WHERE id = $2', [role.toLowerCase(), userId]);
    }

    await client.end();



    return { email, password, token, userId };
};
