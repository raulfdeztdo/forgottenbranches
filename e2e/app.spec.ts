import { test, expect } from '@playwright/test';
import path from 'path';

const REPO_PATH = path.resolve(__dirname, '..');

test.describe('Forgotten Branches App', () => {
  test('shows empty state when no repo is scanned', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Forgotten Branches');
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('No repository scanned');
  });

  test('scans a repo and shows branch table', async ({ page }) => {
    await page.goto('/');

    await page.locator('input.path-input').fill(REPO_PATH);
    await page.locator('button.scan-btn').click();

    await expect(page.locator('table.branch-table')).toBeVisible({ timeout: 15000 });
  });

  test('shows stats bar after scanning', async ({ page }) => {
    await page.goto('/');

    await page.locator('input.path-input').fill(REPO_PATH);
    await page.locator('button.scan-btn').click();

    await expect(page.locator('.stats')).toBeVisible({ timeout: 15000 });
  });

  test('shows legend with branch statuses after scanning', async ({ page }) => {
    await page.goto('/');

    await page.locator('input.path-input').fill(REPO_PATH);
    await page.locator('button.scan-btn').click();

    await expect(page.locator('table.branch-table')).toBeVisible({ timeout: 15000 });

    // Legend in footer is shown after data loads
    await expect(page.getByText('Active').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Forgotten').first()).toBeVisible();
    await expect(page.getByText('Merged').first()).toBeVisible();
    await expect(page.getByText('Orphan').first()).toBeVisible();
    await expect(page.getByText('Abandoned').first()).toBeVisible();
  });
});
