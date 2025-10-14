import { test, expect } from '@playwright/test';

test.describe('Verus Explorer', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check if the page loads without errors
    await expect(page).toHaveTitle(/Verus Explorer/);
  });

  test('should display network dashboard', async ({ page }) => {
    await page.goto('/');

    // Look for network dashboard elements
    await expect(page.locator('text=Network Dashboard')).toBeVisible();
  });

  test('should navigate to blocks page', async ({ page }) => {
    await page.goto('/');

    // Click on blocks tab or navigation
    await page.click('text=Blocks');

    // Verify we're on the blocks page
    await expect(page.locator('text=Latest Blocks')).toBeVisible();
  });

  test('should search for an address', async ({ page }) => {
    await page.goto('/');

    // Look for search input
    const searchInput = page
      .locator('input[placeholder*="search"], input[placeholder*="Search"]')
      .first();
    await expect(searchInput).toBeVisible();

    // Type a test address
    await searchInput.fill('RTest123456789');
    await searchInput.press('Enter');

    // Should show search results or redirect to address page
    await expect(page).toHaveURL(/address/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check if the page is responsive
    await expect(page.locator('text=Network Dashboard')).toBeVisible();
  });
});
