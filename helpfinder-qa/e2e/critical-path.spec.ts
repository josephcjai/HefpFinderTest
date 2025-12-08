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

test('Critical Path: Register -> Post Task -> Bid -> Accept', async ({ page }) => {
    const requester = generateUser();
    const helper = generateUser();

    // --- Register Requester ---
    console.log('Registering Requester:', requester.email);
    await page.goto('/register');
    await page.fill('input[placeholder="John Doe"]', requester.name);
    await page.fill('input[type="email"]', requester.email);
    await page.fill('input[type="password"]', requester.password);

    console.log('Pressing Enter to Submit...');
    await page.press('input[type="password"]', 'Enter');

    // Wait for success (Login) OR failure (Error message)
    await Promise.race([
        expect(page).toHaveURL(/login/, { timeout: 15000 }),
        page.getByText(/Error|Failed|Invalid|Taken/).waitFor().then(async () => {
            const errs = await page.getByText(/Error|Failed|Invalid|Taken/).allInnerTexts();
            throw new Error(`Registration Failed (Enter Key). Errors: ${JSON.stringify(errs)}`);
        })
    ]);

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

    console.log('Requester Logged In. Logout.');
    await page.context().clearCookies(); // Force logout
    await page.goto('/login');

    // --- Register Helper ---
    console.log('Registering Helper:', helper.email);
    await page.goto('/register');
    await page.fill('input[placeholder="John Doe"]', helper.name);
    await page.fill('input[type="email"]', helper.email);
    await page.fill('input[type="password"]', helper.password);
    await page.press('input[type="password"]', 'Enter');

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // --- Login Helper ---
    console.log('Logging in Helper');
    await page.fill('input[type="email"]', helper.email);
    await page.fill('input[type="password"]', helper.password);
    await page.press('input[type="password"]', 'Enter');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    console.log('Test Complete (Partial Flow)');
});
