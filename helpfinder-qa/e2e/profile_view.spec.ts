
import { test, expect } from '@playwright/test';
import { createTestUser } from '../api/utils/api-client';

test.describe('Profile View', () => {
    let user: { email: string; password: string };

    test.beforeAll(async () => {
        user = await createTestUser('REQUESTER');
    });

    test('should allow user to view dashboard and update profile', async ({ page }) => {
        // 1. Login
        await page.goto('/login');
        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', user.password);
        await page.click('button[type="submit"]');

        // Wait for navigation
        await expect(page).toHaveURL('/', { timeout: 15000 });

        // 2. Go to Profile (Direct Navigation)
        await page.goto('/profile');
        await expect(page.getByText('My Dashboard')).toBeVisible();

        // 3. Check Tabs
        const settingsTab = page.getByText('Profile Settings');
        await settingsTab.click();

        // 4. Update Profile
        await expect(page.getByText('Account Details')).toBeVisible();
        await page.fill('input[placeholder*="123 Main St"]', '123 Test St'); // Fuzzy match placeholder

        const saveButton = page.getByRole('button', { name: 'Save Changes' });
        await saveButton.click();

        // 5. Verify Success Toast
        await expect(page.getByText('Profile updated successfully')).toBeVisible();
    });
});
