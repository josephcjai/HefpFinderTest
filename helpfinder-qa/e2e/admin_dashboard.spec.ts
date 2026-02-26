
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

    test('should allow Admin to filter users by Status', async ({ page }) => {
        // 1. Visit Admin Page
        await page.goto('/login');
        await page.fill('input[type="email"]', admin.email);
        await page.fill('input[type="password"]', admin.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/', { timeout: 15000 });
        await page.goto('/admin');

        // 2. Create a test user to block
        const targetUser = await createTestUser('REQUESTER');
        await page.reload(); // Reload to see the new user in the table

        // 3. Find the user in the table and block them
        const userRow = page.locator('tr').filter({ hasText: targetUser.email });
        await expect(userRow).toBeVisible({ timeout: 10000 });

        const blockBtn = userRow.getByRole('button', { name: 'Block' });
        await blockBtn.click();

        // 4. Confirm Block via Modal
        const confirmBtn = page.getByRole('button', { name: 'Block', exact: true }).last();
        await expect(confirmBtn).toBeVisible();
        await confirmBtn.click();

        // 5. Verify status changed to Blocked
        await expect(userRow.getByText('Blocked')).toBeVisible({ timeout: 10000 });

        // 6. Test Status Filtering
        const statusFilter = page.locator('select').first();

        // Filter by Active
        await statusFilter.selectOption('active');
        await expect(userRow).not.toBeVisible({ timeout: 5000 });

        // Filter by Blocked
        await statusFilter.selectOption('blocked');
        await expect(userRow).toBeVisible({ timeout: 5000 });

        // Reset to All
        await statusFilter.selectOption('all');
        await expect(userRow).toBeVisible({ timeout: 5000 });
    });
});

