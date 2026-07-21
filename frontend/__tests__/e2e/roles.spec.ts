import { test, expect } from '@playwright/test';

test.describe('Role-based Access Control (E2E)', () => {
  test('Supervisor should see approval buttons and full inventory access', async ({ page }) => {
    // 1. Mock API response for Supervisor Login
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        json: {
          token: 'fake-supervisor-token',
          user: { id: 6, username: 'supervisor', fullName: 'Super Visor', role: 'admin' }
        }
      });
    });

    // 2. Mock pending transactions
    await page.route('**/transactions?status=pending', async route => {
      await route.fulfill({
        status: 200,
        json: [{ id: 1, type: 'receive', quantity: 50, itemSnapshot: { name: 'Test Item' } }]
      });
    });

    await page.goto('/login');
    await page.fill('input[type="text"]', 'supervisor');
    await page.fill('input[type="password"]', 'super1234');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard and show Supervisor role
    await expect(page.locator('text=Supervisor')).toBeVisible();

    // Check Transactions page for Approve button
    await page.goto('/transactions');
    await expect(page.locator('button:has-text("อนุมัติ")')).toBeVisible();
  });

  test('Staff should NOT see approval buttons', async ({ page }) => {
    // 1. Mock API response for Staff Login
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        json: {
          token: 'fake-staff-token',
          user: { id: 7, username: 'staff', fullName: 'Staff User', role: 'warehouse_staff' }
        }
      });
    });

    await page.route('**/transactions?status=pending', async route => {
      await route.fulfill({
        status: 200,
        json: [{ id: 1, type: 'receive', quantity: 50, itemSnapshot: { name: 'Test Item' } }]
      });
    });

    await page.goto('/login');
    await page.fill('input[type="text"]', 'staff');
    await page.fill('input[type="password"]', 'staff1234');
    await page.click('button[type="submit"]');

    // Check Transactions page
    await page.goto('/transactions');
    // Staff should see a warning label instead of buttons
    await expect(page.locator('text=รอการอนุมัติจาก Supervisor')).toBeVisible();
    await expect(page.locator('button:has-text("อนุมัติ")')).toBeHidden();
  });
});
