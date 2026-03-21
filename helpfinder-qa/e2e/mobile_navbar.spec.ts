import { test, expect } from '@playwright/test';

// Configuration for mobile viewport emulation
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // Standard iPhone 8 / SE dimensions

test.describe('Mobile Navbar Navigation E2E', () => {

    test('should render properly for unauthenticated users in mobile view', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/', { timeout: 60000 });

        // 1. Initial State: The desktop links should NOT be visible due to md:hidden responsive classes
        const desktopLoginBtn = page.locator('div.hidden.md\\:flex').getByRole('link', { name: 'Log In' });
        await expect(desktopLoginBtn).toBeHidden();

        // 2. Open Mobile Menu via Hamburger Toggle
        // The mobile button is located inside the md:hidden container in the header
        const mobileToggleBtn = page.locator('header div.md\\:hidden button');
        await expect(mobileToggleBtn).toBeVisible();
        await mobileToggleBtn.click();

        // 3. Verify Mobile Menu Items Expansion
        // We look for elements explicitly inside the mobile dropdown container
        const mobileMenuDropdown = page.locator('div.animate-fade-in');
        await expect(mobileMenuDropdown).toBeVisible();

        const mobileLoginLink = mobileMenuDropdown.getByRole('link', { name: 'Log In', exact: true });
        const mobileSignUpLink = mobileMenuDropdown.getByRole('link', { name: 'Sign Up', exact: true });
        
        await expect(mobileLoginLink).toBeVisible();
        await expect(mobileSignUpLink).toBeVisible();
        
        // 4. Validate Auto-Closure on Navigation Click
        await mobileLoginLink.click();
        await expect(page).toHaveURL(/.*\/login/);
        
        // Assert the menu is closed
        await expect(mobileMenuDropdown).toBeHidden();
    });

    test('should render authenticated specific links and user metadata inside mobile menu', async ({ page }) => {
        // Register a clean dynamic user to guarantee authentication state
        const uniqueEpoch = new Date().getTime();
        const testEmail = `mobilenav_${uniqueEpoch}@test.com`;

        // We run the registration flow in desktop boundaries for simplicity, then force mobile
        await page.goto('/register', { timeout: 60000 });
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[placeholder="John Doe"]', `mobilenav_${uniqueEpoch}`);
        await page.fill('input[type="password"]', 'NewS3cureP@ssword!');
        
        // Agree to terms if they exist
        const termsCheckbox = page.getByRole('checkbox', { name: /I agree to the Terms of Service/i });
        if (await termsCheckbox.isVisible()) {
            await termsCheckbox.check();
        }

        await page.getByRole('button', { name: 'Register' }).click();
        
        // Wait for redirect to Login
        await expect(page).toHaveURL(/.*\/login/i, { timeout: 15000 });
        
        // Log in with the newly created credential
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', 'NewS3cureP@ssword!');
        await page.getByRole('button', { name: 'Login' }).click();
        
        // Wait for final auth redirect to dashboard/homepage
        await expect(page).toHaveURL(/.*\//, { timeout: 15000 });

        // Now shift viewport instantly to mobile
        await page.setViewportSize(MOBILE_VIEWPORT);

        // Open the Hamburger Dropdown
        const mobileToggleBtn = page.locator('header div.md\\:hidden button');
        await expect(mobileToggleBtn).toBeVisible();
        await mobileToggleBtn.click();

        const mobileMenuDropdown = page.locator('div.animate-fade-in');
        await expect(mobileMenuDropdown).toBeVisible();

        // Verify Authenticated State Renders the Avatar and Personal Options
        await expect(mobileMenuDropdown.getByText(`mobilenav_${uniqueEpoch}`)).toBeVisible();
        
        const myProfileLink = mobileMenuDropdown.getByRole('link', { name: /My Profile/i });
        await expect(myProfileLink).toBeVisible();

        const logoutBtn = mobileMenuDropdown.getByRole('button', { name: /Logout/i });
        await expect(logoutBtn).toBeVisible();

        // Verify Standard users DO NOT see the Admin Dashboard in their list
        const adminDashboardLink = mobileMenuDropdown.getByRole('link', { name: /Admin Dashboard/i });
        await expect(adminDashboardLink).toBeHidden();

        // Verify Auto-Closed Routing for Authenticated elements
        await myProfileLink.click();
        await expect(page).toHaveURL(/.*\/profile/);
        await expect(mobileMenuDropdown).toBeHidden();
    });
});
