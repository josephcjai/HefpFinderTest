
import { test, expect } from '@playwright/test';

test.describe('Legal Pages and Disclaimers', () => {

    test('should load Terms of Service page with correct content', async ({ page }) => {
        await page.goto('/terms');
        await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
        await expect(page.getByText('1. Acceptance of Terms')).toBeVisible();
        await expect(page.getByText('Liability Disclaimer (No Warranty)')).toBeVisible();
        await expect(page.getByText('HelpFinder4U acts solely as a venue')).toBeVisible();
    });

    test('should load Privacy Policy page with correct content', async ({ page }) => {
        await page.goto('/privacy');
        await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
        await expect(page.getByText('1. Information We Collect')).toBeVisible();
        await expect(page.getByText('Data Security')).toBeVisible();
    });

    test('should verify legal links in the footer', async ({ page }) => {
        await page.goto('/');

        // Find links in footer
        const termsLink = page.getByRole('link', { name: 'Terms' });
        const privacyLink = page.getByRole('link', { name: 'Privacy' });

        await expect(termsLink).toBeVisible();
        await expect(privacyLink).toBeVisible();

        // Navigate to Terms via Footer
        await termsLink.click();
        await expect(page).toHaveURL('/terms');
        await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();

        // Go back and navigate to Privacy via Footer
        await page.goto('/');
        await privacyLink.click();
        await expect(page).toHaveURL('/privacy');
        await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    });
});
