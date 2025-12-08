import axios from 'axios';

const API_URL = process.env.API_URL || 'http://127.0.0.1:4000';

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

    // Fetch userId
    let userId = registerRes.data.id;
    if (!userId && token) {
        const profileRes = await authenticatedClient(token).get('/auth/profile');
        userId = profileRes.data.id || profileRes.data.sub;
    }

    return { email, password, token, userId };
};
