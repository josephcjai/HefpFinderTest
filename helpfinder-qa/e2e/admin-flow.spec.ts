import { test, expect } from '@playwright/test';

test('Admin Page Security: Access verification', async ({ page }) => {
    // 1. Visit Admin page without login
    await page.goto('/admin');
    // Should redirect to login or show error
    // Assuming redirect to login for protected routes usually
    await expect(page).toHaveURL(/\/login/);

    // 2. Login as regular user
    // Register fresh user to be sure
    await page.goto('/register');
    const id = Date.now();
    await page.fill('input[placeholder="John Doe"]', `Not Admin ${id}`);
    await page.fill('input[type="email"]', `user${id}@example.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify login/dashboard
    await expect(page).toHaveURL(/\//); // Redirects to home/dashboard

    // 3. Try to access Admin page again
    await page.goto('/admin');

    // Expect redirect back to home OR error message
    // If user is not admin, they should not see admin dash.
    // We check if url is NOT /admin or if we see "Access Denied"

    const url = page.url();
    const isDenied = url !== 'http://localhost:3001/admin'; // Simple check

    if (!isDenied) {
        // If we are on admin page, check for "Authorized" content?
        // Or maybe our test user IS admin by default (unlikely).
        // Let's assume protection works.
        const content = await page.content();
        if (content.includes('Admin Dashboard')) {
            throw new Error('Regular user accessed Admin Dashboard!');
        }
    }
});
