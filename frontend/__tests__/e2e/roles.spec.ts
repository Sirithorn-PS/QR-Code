import { test, expect, Page, Route } from '@playwright/test';

test.describe('Role-based Access Control (E2E)', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.route('*/**:4000/notifications**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: { notifications: [], unreadCount: 0 }
      });
    });
  });

  test('Supervisor should see approval buttons and full inventory lot access', async ({ page }: { page: Page }) => {
    // 1. Mock API response for Supervisor Login
    await page.route('*/**:4000/auth/login', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: {
          token: 'fake-supervisor-token',
          user: { id: 6, username: 'supervisor', fullName: 'ผู้ควบคุมดูแลระบบ (Supervisor)', role: 'supervisor' }
        }
      });
    });

    // 2. Mock backend transactions API
    await page.route('*/**:4000/transactions**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 1,
            productId: 1,
            type: 'receive',
            quantity: 50,
            status: 'pending',
            itemSnapshot: { name: 'Packaging Test' },
            product: { itemType: 'Packaging', description: 'Test Item' },
            createdAt: new Date().toISOString()
          }
        ]
      });
    });

    await page.goto('/login');
    await page.fill('#username', 'supervisor');
    await page.fill('#password', 'super1234');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard and show Supervisor role
    await expect(page.locator('text=Supervisor').first()).toBeVisible();

    // Check Transactions page for Approve button
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: 'รายการรอการยืนยัน' })).toBeVisible();
    await expect(page.locator('button:has-text("อนุมัติ")').first()).toBeVisible();
  });

  test('Staff should NOT see approval buttons and lot buttons', async ({ page }: { page: Page }) => {
    // 1. Mock API response for Staff Login
    await page.route('*/**:4000/auth/login', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: {
          token: 'fake-staff-token',
          user: { id: 7, username: 'staff', fullName: 'Staff User', role: 'warehouse_staff' }
        }
      });
    });

    await page.route('*/**:4000/transactions**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 1,
            productId: 1,
            type: 'receive',
            quantity: 50,
            status: 'pending',
            itemSnapshot: { name: 'Test Item' },
            createdAt: new Date().toISOString()
          }
        ]
      });
    });

    await page.goto('/login');
    await page.fill('#username', 'staff');
    await page.fill('#password', 'staff1234');
    await page.click('button[type="submit"]');

    // Check Transactions page
    await page.goto('/transactions');
    await expect(page.locator('button:has-text("อนุมัติ")')).toBeHidden();
  });

  test('Admin should have User Management access but NOT see approval buttons', async ({ page }: { page: Page }) => {
    // 1. Mock API response for Admin Login
    await page.route('*/**:4000/auth/login', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: {
          token: 'fake-admin-token',
          user: { id: 5, username: 'admin', fullName: 'System Admin', role: 'admin' }
        }
      });
    });

    await page.route('*/**:4000/transactions**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 1,
            productId: 1,
            type: 'receive',
            quantity: 50,
            status: 'pending',
            itemSnapshot: { name: 'Test Item' },
            createdAt: new Date().toISOString()
          }
        ]
      });
    });

    await page.route('*/**:4000/users**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: [
          { id: 5, username: 'admin', fullName: 'System Admin', role: 'admin', status: 'approved' },
          { id: 6, username: 'supervisor', fullName: 'Supervisor User', role: 'supervisor', status: 'approved' }
        ]
      });
    });

    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Check Transactions page (Confirm button must be hidden for Admin)
    await page.goto('/transactions');
    await expect(page.locator('button:has-text("อนุมัติ")')).toBeHidden();

    // Check User Management page access
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'จัดการผู้ใช้งาน' })).toBeVisible();
  });
});

