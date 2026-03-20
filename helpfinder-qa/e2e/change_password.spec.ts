import { test, expect } from '@playwright/test';

const generateUser = () => {
    const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return {
        email: `pw_test_${id}@example.com`,
        password: 'password123',
        name: `Test User ${id}`,
    };
};

test.describe('Change Password Flow E2E', () => {
    test.setTimeout(60000);

    test('should execute full password update flow and dynamic UI validations', async ({ page }) => {
        const user = generateUser();

        // 1. Register and Login
        await page.goto('/register');
        await page.fill('input[placeholder="John Doe"]', user.name);
        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', user.password);
        await page.locator('input[type="checkbox"]#terms').check();
        await page.getByRole('button', { name: 'Register' }).click();
        
        await expect(page).toHaveURL(/login/, { timeout: 15000 });
        
        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', user.password);
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page).toHaveURL('/', { timeout: 15000 });

        // 2. Navigate to Profile Settings
        await page.goto('/profile');
        await page.getByRole('button', { name: 'Profile Settings' }).click();

        // 3. UI Expansion Logic
        const changePwdBtn = page.getByRole('button', { name: 'Change Password' });
        await expect(changePwdBtn).toBeVisible();
        await changePwdBtn.click();
        
        // Wait for field expansion
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
        
        // We use targeted placeholders based on the developer UI implementation
        const currentPwdInput = page.getByPlaceholder('Enter your current password');
        const newPwdInput = page.getByPlaceholder('At least 6 characters');
        const confirmPwdInput = page.getByPlaceholder('Repeat new password');
        
        await expect(currentPwdInput).toBeVisible();
        await expect(newPwdInput).toBeVisible();
        await expect(confirmPwdInput).toBeVisible();

        // 4. Password Strength Indicator Validations
        // Testing extreme boundaries to avoid proprietary algorithm flakiness
        await newPwdInput.fill('1'); // Weak
        await expect(page.locator('text=Weak').first()).toBeVisible();

        await newPwdInput.fill('NewS3cureP@ssword!'); // Strong
        await expect(page.locator('text=Strong').first()).toBeVisible();

        // 5. Client-Side Validation Restrictions
        await newPwdInput.fill('short');
        const updateBtn = page.getByRole('button', { name: 'Update Password' });
        await expect(updateBtn).toBeDisabled();

        await newPwdInput.fill('StrongP@ssw0rd!');
        await confirmPwdInput.fill('StrongP@ssw0rd'); // Mismatch validation
        await expect(page.getByText('Passwords do not match')).toBeVisible();
        await expect(updateBtn).toBeDisabled();

        await confirmPwdInput.fill('StrongP@ssw0rd!');
        await expect(page.getByText('Passwords do not match')).not.toBeVisible();
        
        // Now provide the current password context
        await currentPwdInput.fill('incorrect_password');
        await expect(updateBtn).toBeEnabled();

        // 6. Backend Validation Flow (Incorrect Password via UI submit)
        await updateBtn.click();
        
        // Wait for confirmation modal
        const modalConfirmBtn = page.getByRole('button', { name: 'Yes, Change Password' });
        await expect(modalConfirmBtn).toBeVisible();
        await modalConfirmBtn.click();
        
        // Expect rejection toast
        await expect(page.getByText('Current password is incorrect')).toBeVisible({ timeout: 10000 });

        // 7. Successful Flow & UI Sync
        await currentPwdInput.fill('password123');
        await newPwdInput.fill('NewS3cureP@ssword!');
        await confirmPwdInput.fill('NewS3cureP@ssword!');
        
        await updateBtn.click();
        await page.getByRole('button', { name: 'Yes, Change Password' }).click();
        
        // Test states collapse and success indicators
        await expect(page.getByText('Password updated!')).toBeVisible({ timeout: 10000 });
        await expect(updateBtn).not.toBeVisible();

        // 8. Post-Change Authentication Block
        await page.evaluate(() => localStorage.clear());
        await page.evaluate(() => sessionStorage.clear());
        await page.context().clearCookies();
        await page.goto('/login');
        
        // Assert old credentials fail globally
        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', user.password);
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page.getByText(/(Invalid email or password|Incorrect credentials)/i)).toBeVisible({ timeout: 10000 });

        // Assert new credentials securely authenticate
        await page.fill('input[type="password"]', 'NewS3cureP@ssword!');
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page).toHaveURL(/\//, { timeout: 15000 });
        
        // Just verify we made it in
        await expect(page.locator('text=Post a Task')).toBeVisible({ timeout: 10000 });
    });
});
