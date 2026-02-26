import { test, expect } from '@playwright/test';
import { createTestUser, authenticatedClient } from '../api/utils/api-client';

test.describe('Cancel Bids E2E', () => {
    let requester: any;
    let helper: any;
    let taskId: string;

    // Set up the database state (open task, pending bid) before the UI test runs
    test.beforeAll(async () => {
        requester = await createTestUser('REQUESTER');
        helper = await createTestUser('HELPER');

        const reqClient = authenticatedClient(requester.token);
        const helperClient = authenticatedClient(helper.token);

        // 1. Create Task
        const taskRes = await reqClient.post('/tasks', {
            title: 'Task for Bid Withdrawal E2E',
            description: 'A helper will bid then withdraw',
            budgetMin: 50, budgetMax: 100,
            latitude: 40.7, longitude: -74,
            address: '123 E2E St', country: 'US', zipCode: '10001'
        });
        taskId = taskRes.data.id;

        // 2. Place Bid via API
        await helperClient.post(`/tasks/${taskId}/bids`, { amount: 80, message: 'I can do it' });
    });

    test('Helper can see and withdraw their bid using the UI', async ({ page }) => {
        // Login as Helper
        await page.goto('/login');
        await page.fill('input[type="email"]', helper.email);
        await page.fill('input[type="password"]', helper.password);
        await page.press('input[type="password"]', 'Enter');
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Navigate to the task
        await page.goto(`/tasks/${taskId}`);

        // The helper should see their existing bid with a "Withdraw" button
        const withdrawBtn = page.locator('button:has-text("Withdraw")');
        try {
            await expect(withdrawBtn).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.error('Withdraw button not found. Page text:');
            console.error(await page.locator('body').innerText());
            throw e;
        }
        await withdrawBtn.click();

        // A confirmation modal should appear
        const confirmBtn = page.locator('button:has-text("Withdraw")').last();
        await expect(confirmBtn).toBeVisible({ timeout: 5000 });
        await confirmBtn.click();

        // After withdrawing, the bid card should no longer show "Withdraw"
        // and we should see the "Place a Bid" button again
        const placeBidBtn = page.locator('button:has-text("Place a Bid")');
        await expect(placeBidBtn).toBeVisible({ timeout: 10000 });
    });
});
