import { test, expect } from '@playwright/test';

test('workspace navigation remains visible and labelled on desktop and mobile', async ({ page }) => {
  await page.goto('/demo');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByText('Explore & plan', { exact: true })).toBeVisible();
    await expect(page.getByText('Your workspace', { exact: true })).toBeVisible();
    const roles = page.getByRole('navigation', { name: 'Role navigation' });
    await expect(roles.getByRole('link', { name: 'Farmer', exact: true })).toBeVisible();
    await expect(roles).toContainText('View approved plan');
    await expect(roles).toContainText('Review & approve lots');
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Demo Lab', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'artifacts/browser/navigation-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'artifacts/browser/navigation-desktop.png' });
  await page.getByRole('navigation', { name: 'Role navigation' }).getByRole('link', { name: 'Farmer', exact: true }).click();
  await expect(page).toHaveURL(/\/farmer$/);
  await expect(page.getByRole('link', { name: 'Farmer', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Coordinator', exact: true }).click();
  await expect(page).toHaveURL(/\/coordinator$/);
  await expect(page.getByRole('link', { name: 'Coordinator', exact: true })).toHaveAttribute('aria-current', 'page');
});
