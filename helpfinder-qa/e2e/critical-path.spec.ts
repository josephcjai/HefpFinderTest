import { test, expect } from '@playwright/test';

const generateUser = () => {
    // Add random suffix to ensure uniqueness even if ran rapidly
    const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return {
        email: `e2e_${id}@example.com`,
        password: 'password123',
        name: `User ${id}`,
    };
};

test('Critical Path: Register -> Post Task -> Bid -> Accept', async ({ page, browser }) => {
    test.setTimeout(90000); // The full flow takes > 30s due to 4 separate user authentications

    const requester = generateUser();
    const helper = generateUser();

    // --- Register Requester ---
    console.log('Registering Requester:', requester.email);
    await page.goto('/register');
    await page.fill('input[placeholder="John Doe"]', requester.name);
    await page.fill('input[type="email"]', requester.email);
    await page.fill('input[type="password"]', requester.password);
    await page.locator('input[type="checkbox"]#terms').check();
    console.log('Pressing Enter to Submit...');
    await page.press('input[type="password"]', 'Enter');

    // Wait for success (Login)
    await expect(page).toHaveURL(/login/, { timeout: 15000 });

    // --- Login Requester ---
    console.log('Logging in Requester');
    await page.fill('input[type="email"]', requester.email);
    await page.fill('input[type="password"]', requester.password);

    // Use Enter here too for consistency
    await page.press('input[type="password"]', 'Enter');

    // Check for login errors
    const loginError = page.locator('div[style*="color: var(--danger)"]');
    if (await loginError.isVisible()) {
        console.error('Login Error:', await loginError.textContent());
    }

    await expect(page).toHaveURL('/', { timeout: 10000 });

    // --- Requester: Post Task ---
    console.log('Requester Posting Task');
    await page.getByRole('button', { name: 'Post a Task' }).click();
    const taskTitle = `UI Test Task ${Date.now()}`;
    await page.fill('input[placeholder="e.g. Fix my sink"]', taskTitle);
    await page.fill('textarea[placeholder="Describe what you need help with..."]', 'Full UI-driven E2E test task.');
    await page.fill('input[placeholder="e.g. 50"]', '100');
    await page.fill('input[placeholder="e.g. 123 Main St"]', '456 UI Avenue');
    await expect(page.getByText('HelpFinder4U is not responsible for payments')).toBeVisible();
    await page.click('button[type="submit"]:has-text("Post Task")');

    // Wait for modal to close and task to appear in list
    await expect(page.locator('button[type="submit"]:has-text("Post Task")')).not.toBeVisible({ timeout: 10000 });
    console.log('Task Posted. Finding in list...');

    // Find correctly named task and click to navigate
    const taskLink = page.locator('h3', { hasText: taskTitle }).first();
    await taskLink.click();

    // Verify redirect to task page
    await expect(page).toHaveURL(/\/tasks\//, { timeout: 15000 });
    const taskUrl = page.url();
    console.log('Arrived at Task Details:', taskUrl);

    // --- Logout Requester ---
    console.log('Logging out Requester');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
    await page.context().clearCookies();
    await page.goto('/login');

    // --- Register Helper ---
    console.log('Registering Helper:', helper.email);
    await page.goto('/register');
    await page.fill('input[placeholder="John Doe"]', helper.name);
    await page.fill('input[type="email"]', helper.email);
    await page.fill('input[type="password"]', helper.password);
    await page.locator('input[type="checkbox"]#terms').check();
    await page.press('input[type="password"]', 'Enter');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // --- Login Helper ---
    console.log('Logging in Helper');
    await page.fill('input[type="email"]', helper.email);
    await page.fill('input[type="password"]', helper.password);
    await page.press('input[type="password"]', 'Enter');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // --- Helper: Place Bid ---
    console.log('Helper Placing Bid');
    await page.goto(taskUrl);
    await page.click('button:has-text("Place a Bid")');
    await page.fill('input[type="number"]', '90');
    await page.fill('input[placeholder*="Message"]', 'I can do this purely via UI!');
    await page.getByText('I agree to the Terms of Service. HelpFinder is a matching service and carries no liability.').click();
    await page.click('button:has-text("Submit Bid")');
    await expect(page.getByText('I can do this purely via UI!')).toBeVisible({ timeout: 10000 });

    // --- Logout Helper ---
    console.log('Logging out Helper');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
    await page.context().clearCookies();
    await page.goto('/login');

    // --- Login Requester ---
    console.log('Logging in Requester again');
    await page.fill('input[type="email"]', requester.email);
    await page.fill('input[type="password"]', requester.password);
    await page.press('input[type="password"]', 'Enter');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // --- Requester: Accept Bid ---
    console.log('Requester Accepting Bid');
    await page.goto(taskUrl);
    await page.click('button:has-text("Accept Bid")');

    // Confirmation modal - wait for overlay and click confirm button inside it
    await page.waitForTimeout(500);
    await expect(page.getByText('IMPORTANT: All payments must be handled externally')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Wait for the success toast explicitly to ensure the backend registered the acceptance
    await expect(page.getByText('Bid accepted successfully')).toBeVisible({ timeout: 15000 });
    // Verify the bid item itself shows Accepted
    await expect(page.locator('.p-4').getByText('Accepted', { exact: true })).toBeVisible({ timeout: 15000 });

    // --- Logout Requester ---
    console.log('Logging out Requester');
    // Best practice for Next.js testing without API endpoints: clear storage, reload to drop state, then navigate to login
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
    await page.context().clearCookies();
    await page.goto('/login');

    // --- Login Helper ---
    console.log('Logging in Helper to complete task');

    // Explicitly wait for the inputs to be ready
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(helper.email);

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(helper.password);

    // Explicitly click the login button instead of pressing Enter to ensure React form submission triggers reliably
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for the UI to fully authenticate and render the Helper's name in the header
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.getByRole('link', { name: new RegExp(helper.name) })).toBeVisible({ timeout: 15000 });

    // --- Helper: Start & Request Completion ---
    console.log('Helper starting task');

    // Navigate directly to the task URL to bypass volatile intermediate rendering
    await page.goto(taskUrl);

    // Explicitly wait for the task details to load AND the task status to shift to ACCEPTED in the browser DOM
    await expect(page.locator('h1 + div').getByText(/^ACCEPTED$/, { exact: true })).toBeVisible({ timeout: 15000 });
    // Scroll to the top as requested before looking for the button
    await page.evaluate(() => window.scrollTo(0, 0));
    // Brief pause to ensure scroll completes
    await page.waitForTimeout(500);

    // Wait for the Actions section and Start Task button to render
    const startBtn = page.locator('button:has-text("Start Task")').first();
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    // Scroll element into view before clicking to ensure it's not hidden behind fixed headers/footers
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click({ force: true });

    // Wait for the exact modal confirmation to appear and target the button inside it
    await expect(page.locator('.fixed.inset-0').getByText('I agree to the Terms of Service and commit to fulfilling this task.')).toBeVisible({ timeout: 10000 });
    await page.locator('.fixed.inset-0 input[type="checkbox"]').check();
    const startConfirmBtn = page.locator('.fixed.inset-0').getByRole('button', { name: 'Start Task' });
    await expect(startConfirmBtn).toBeVisible({ timeout: 5000 });
    await startConfirmBtn.click();

    // Ensure the modal closes before checking the status
    await expect(startConfirmBtn).not.toBeVisible({ timeout: 10000 });

    await expect(page.locator('h1 + div').getByText(/^IN_PROGRESS$/, { exact: true })).toBeVisible({ timeout: 10000 });

    console.log('Helper marking task as done');
    await page.getByRole('button', { name: 'Mark as Done' }).click();

    const markDoneConfirm = page.locator('.fixed.inset-0').getByRole('button', { name: 'Confirm' });
    await expect(markDoneConfirm).toBeVisible({ timeout: 5000 });
    await markDoneConfirm.click();
    await expect(markDoneConfirm).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator('h1 + div').getByText(/^REVIEW_PENDING$/, { exact: true })).toBeVisible({ timeout: 10000 });

    // --- Final Step: Requester Approves ---
    console.log('Requester approving completion');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
    await page.context().clearCookies();
    await page.goto('/login');
    await page.fill('input[type="email"]', requester.email);
    await page.fill('input[type="password"]', requester.password);
    await page.press('input[type="password"]', 'Enter');

    // Wait for the login redirect to finish before navigating to the task
    await expect(page).toHaveURL('/', { timeout: 10000 });

    await page.goto(taskUrl);
    // Let page fully load
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Approve & Close")');

    // Wait for the exact modal confirmation to appear and target the button inside it
    const approveConfirmBtn = page.locator('.fixed.inset-0').getByRole('button', { name: 'Confirm' });
    await expect(approveConfirmBtn).toBeVisible({ timeout: 5000 });
    await approveConfirmBtn.click();

    // Ensure the modal closes before checking the status
    await expect(approveConfirmBtn).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator('h1 + div').getByText(/^COMPLETED$/, { exact: true })).toBeVisible({ timeout: 15000 });

    console.log('Critical Path Full UI Test Complete!');
});
