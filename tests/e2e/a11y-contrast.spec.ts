import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/?tab=explorer', '/?tab=verusids'];

async function runAxe(page: any, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();
  expect(results.violations, `${url} has a11y contrast violations`).toEqual([]);
}

test.describe('Color contrast - Light theme', () => {
  for (const url of PAGES) {
    test(`light: ${url}`, async ({ page }) => {
      // Ensure light theme (remove dark class if present)
      await page.addInitScript(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await runAxe(page, url);
    });
  }
});

test.describe('Color contrast - Dark theme', () => {
  for (const url of PAGES) {
    test(`dark: ${url}`, async ({ page }) => {
      // Force dark class for Tailwind dark mode
      await page.addInitScript(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await runAxe(page, url);
    });
  }
});
