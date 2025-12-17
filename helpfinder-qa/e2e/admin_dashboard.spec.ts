
import { test, expect } from '@playwright/test';
import { createTestUser } from '../api/utils/api-client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

test.describe('Admin Dashboard', () => {
    let admin: { email: string; password: string };

    test.beforeAll(async () => {
        // 1. Create User
        admin = await createTestUser('REQUESTER');

        // 2. Promote to Admin via Script
        const projectRoot = path.resolve('../temp_analysis/services/api');
        const env = {
            ...process.env,
            DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/helpfinder_test'
        };
        // Ensure we promote properly
        await execAsync(`npm run seed:admin -- ${admin.email}`, { cwd: projectRoot, env });
    });

    test('should allow Admin to access dashboard via Navbar Link', async ({ page }) => {
        // 1. Login
        await page.goto('/login');
        await page.fill('input[type="email"]', admin.email);
        await page.fill('input[type="password"]', admin.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/', { timeout: 15000 });

        // 2. Click Admin Link in Navbar
        const adminLink = page.getByRole('link', { name: 'Admin', exact: true });

        await expect(adminLink).toBeVisible({ timeout: 10000 });
        await adminLink.click();

        // 3. Verify Dashboard
        await expect(page).toHaveURL('/admin');
        await expect(page.getByText('User Management')).toBeVisible({ timeout: 10000 });

        // 4. Verify User Table Headers
        // Optional: wait for table to load
        // await expect(page.getByText('Name', { exact: true })).toBeVisible();
    });
});
