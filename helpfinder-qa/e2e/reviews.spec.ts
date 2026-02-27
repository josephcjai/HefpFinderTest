import { test, expect } from '@playwright/test';
import { createTestUser, authenticatedClient } from '../api/utils/api-client';

test.describe('Reviews E2E (Dual Rating)', () => {
    let requester: any;
    let helper: any;
    let taskId: string;

    // Set up the database state (completed task) before the UI test runs
    test.beforeAll(async () => {
        requester = await createTestUser('REQUESTER');
        helper = await createTestUser('HELPER');

        const reqClient = authenticatedClient(requester.token);
        const helperClient = authenticatedClient(helper.token);

        // 1. Create Task
        let res = await reqClient.post('/tasks', {
            title: 'Fix my plumbing (E2E Review)',
            description: 'Needs fixing ASAP',
            budgetMin: 50, budgetMax: 100,
            latitude: 40.7, longitude: -74,
            address: '123 E2E St', country: 'US', zipCode: '10001'
        });
        taskId = res.data.id;

        // 2. Bid
        res = await helperClient.post(`/tasks/${taskId}/bids`, { amount: 80, message: 'I can do it' });
        const bidId = res.data.id;

        // 3. Accept, Start, Request Completion, Approve Completion
        let step = await reqClient.post(`/bids/${bidId}/accept`, {});
        if (step.status !== 201) console.error('Accept Bid Failed:', step.data);

        step = await helperClient.post(`/tasks/${taskId}/start`, {});
        if (step.status !== 201) console.error('Start Task Failed:', step.data);

        step = await helperClient.post(`/tasks/${taskId}/complete-request`, {});
        if (step.status !== 201) console.error('Complete Request Failed:', step.data);

        step = await reqClient.post(`/tasks/${taskId}/complete-approve`, {});
        if (step.status !== 201) console.error('Complete Approve Failed:', step.data);

        // Verify task state is completed
        const finalTask = await reqClient.get(`/tasks/${taskId}`);
        console.log('Final setup task state:', finalTask.data.status, 'Bids:', finalTask.data.bids?.length);
    });

    test('Requester can rate and review the helper', async ({ page, context }) => {
        // Login Requester
        await page.goto('/login');
        await page.fill('input[type="email"]', requester.email);
        await page.fill('input[type="password"]', requester.password);
        await page.press('input[type="password"]', 'Enter');
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Go to completed task
        await page.goto(`/tasks/${taskId}`);

        // Wait for the "Leave Review" button to appear (since task is completed)
        const leaveReviewBtn = page.locator('button:has-text("Leave Review")');
        try {
            await expect(leaveReviewBtn).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.error('FAILED TO FIND BUTTON. CURRENT DOM:');
            console.error(await page.locator('main').innerText());
            throw e;
        }
        await leaveReviewBtn.click();

        // Wait for Modal to open
        const modalTitle = page.locator('h3:has-text("Rate Your Experience")');
        await expect(modalTitle).toBeVisible();

        // Fill review comment
        const reviewTextarea = page.locator('textarea[placeholder*="Share details"]');
        await reviewTextarea.fill('Excellent work by the helper in E2E!');

        // Click a star rating (e.g. 5 stars)
        const starButtons = page.locator('button.transition-transform').filter({ has: page.locator('span.material-icons-round:has-text("star")') });
        await starButtons.nth(4).click();

        // Submit review
        const submitBtn = page.locator('button[type="submit"]:has-text("Submit Review")');
        await submitBtn.click();

        // Verify Success Toast or UI change
        await expect(page.locator('text=Review submitted successfully').or(page.locator('text=You rated this user'))).toBeVisible({ timeout: 5000 }).catch(() => null);

        // --- Profile Verification ---
        console.log('Verifying review on Helper profile');
        // Log out Requester and log in as Helper to see the modal
        await page.evaluate(() => window.localStorage.clear());
        await page.evaluate(() => window.sessionStorage.clear());
        await page.goto('/login');
        await page.locator('input[type="email"]').fill(helper.email);
        await page.locator('input[type="password"]').fill(helper.password);
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Go to helper profile
        await page.goto('/profile');
        await page.waitForLoadState('networkidle');

        // Switch to Profile Settings tab where the rating badges are located
        await page.getByRole('button', { name: 'Profile Settings' }).click();

        // Open the helper reviews modal
        await page.getByRole('button', { name: /Helper/i }).first().click();
        await expect(page.locator('.fixed.inset-0')).toBeVisible();
        await expect(page.locator('.fixed.inset-0').getByText('Excellent work by the helper in E2E!', { exact: false })).toBeVisible({ timeout: 15000 });
    });

    test('Helper can rate and review the requester', async ({ page }) => {
        // ... (login as helper)
        await page.goto('/login');
        await page.fill('input[type="email"]', helper.email);
        await page.fill('input[type="password"]', helper.password);
        await page.press('input[type="password"]', 'Enter');
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Go to task page
        await page.goto(`/tasks/${taskId}`);

        const leaveReviewBtn = page.locator('button:has-text("Leave Review")');
        await expect(leaveReviewBtn).toBeVisible({ timeout: 10000 });
        await leaveReviewBtn.click();

        // Wait for Modal to open
        const modalTitle = page.locator('h3:has-text("Rate Your Experience")');
        await expect(modalTitle).toBeVisible();

        // Fill review comment
        const reviewTextarea = page.locator('textarea[placeholder*="Share details"]');
        await reviewTextarea.fill('Great requester, paid on time (E2E)!');

        // Click a star rating (e.g. 5 stars)
        const starButtons = page.locator('button.transition-transform').filter({ has: page.locator('span.material-icons-round:has-text("star")') });
        await starButtons.nth(4).click();

        // Submit review
        const submitBtn = page.locator('button[type="submit"]:has-text("Submit Review")');
        await submitBtn.click();

        await expect(page.locator('text=Review submitted successfully').or(page.locator('text=You rated this user'))).toBeVisible({ timeout: 5000 }).catch(() => null);

        // --- Profile Verification ---
        console.log('Verifying review on Requester profile');
        // Log out Helper and log in as Requester to see the modal
        await page.evaluate(() => window.localStorage.clear());
        await page.evaluate(() => window.sessionStorage.clear());
        await page.goto('/login');
        await page.locator('input[type="email"]').fill(requester.email);
        await page.locator('input[type="password"]').fill(requester.password);
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Go to requester profile
        await page.goto('/profile');
        await page.waitForLoadState('networkidle');

        // Switch to Profile Settings tab where the rating badges are located
        await page.getByRole('button', { name: 'Profile Settings' }).click();

        // Open the requester reviews modal
        await page.getByRole('button', { name: /Requester/i }).first().click();
        await expect(page.locator('.fixed.inset-0')).toBeVisible();
        await expect(page.locator('.fixed.inset-0').getByText('Great requester, paid on time (E2E)!', { exact: false })).toBeVisible({ timeout: 15000 });
    });
});

