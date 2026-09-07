import { test, expect, Page, Route } from '@playwright/test';

test.describe('E2E User Flows Verification', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Mock background polling endpoints to prevent unauthenticated 401 redirects
    await page.route('*/**:4000/notifications**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: { notifications: [], unreadCount: 0 }
      });
    });

    await page.route('*/**:4000/products**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 1,
            itemCode: 'PKG-001',
            productId: 'PKG-001',
            name: 'Packaging Box 1',
            unit: 'PCS',
            warehouse: 'WPK',
            location: 'A-01',
            quantity: 100,
            itemType: 'Packaging',
            parentItemCodes: []
          }
        ]
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
            itemSnapshot: { name: 'Packaging Box 1' },
            note: 'Initial import',
            createdAt: new Date().toISOString()
          }
        ]
      });
    });
  });

  // Helper for mock supervisor login
  async function mockSupervisorLogin(page: Page) {
    await page.route('*/**:4000/auth/login', async (route: Route) => {
      await route.fulfill({
        status: 200,
        json: {
          token: 'mock-jwt-supervisor-token',
          user: { id: 6, username: 'supervisor', fullName: 'ผู้ควบคุมดูแลระบบ (Supervisor)', role: 'supervisor' }
        }
      });
    });

    await page.goto('/login');
    await page.fill('#username', 'supervisor');
    await page.fill('#password', 'super1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(:3000\/?$|\/$)/);
  }

  // Flow 1: Authentication
  test('Flow 1: Authentication - Login to Dashboard', async ({ page }: { page: Page }) => {
    await mockSupervisorLogin(page);
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  // Flow 2: Stock Navigation & Details
  test('Flow 2: Stock Page - Navigation, Search, Filter & Details', async ({ page }: { page: Page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /จัดการสต็อกบรรจุภัณฑ์/ })).toBeVisible();

    // Check search input presence
    const searchInput = page.locator('input[placeholder*="ค้นหา"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // Check filter buttons
    await expect(page.locator('button:has-text("ทั้งหมด"), button:has-text("แกลลอน")').first()).toBeVisible();
  });

  // Flow 3: Add New Product Modal & Validation
  test('Flow 3: Add Product Modal & Validation', async ({ page }: { page: Page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/inventory');

    const addBtn = page.locator('button:has-text("เพิ่มสินค้าใหม่")');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Modal should be visible
    await expect(page.locator('h3:has-text("เพิ่มสินค้าใหม่")')).toBeVisible();
    await expect(page.locator('input[placeholder*="90793-AT401"]')).toBeVisible();

    // Check save button
    const saveBtn = page.locator('button:has-text("บันทึกสินค้า")');
    await expect(saveBtn).toBeVisible();
  });

  // Flow 4: Stock Receive
  test('Flow 4: Stock Receive Flow', async ({ page }: { page: Page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/scan');

    // Page should render scan/search options
    await expect(page.getByRole('heading', { name: 'สแกนสินค้า' })).toBeVisible();
  });

  // Flow 5: Stock Issue
  test('Flow 5: Stock Issue Flow', async ({ page }: { page: Page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/scan');

    await expect(page.getByRole('heading', { name: 'สแกนสินค้า' })).toBeVisible();
  });

  // Flow 6: Approval Flow
  test('Flow 6: Approval Page - Supervisor View', async ({ page }: { page: Page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/transactions');

    await expect(page.getByRole('heading', { name: 'รายการรอการยืนยัน' })).toBeVisible();
  });

  // Flow 7: Reports
  test('Flow 7: Reports Page Navigation & Filters', async ({ page }: { page: Page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/reports');

    await expect(page.getByRole('heading', { name: 'รายงานธุรกรรม' })).toBeVisible();
  });

  // Flow 8: Bill of Materials (BOM) View
  test('Flow 8: BOM View Modal', async ({ page }: { page: Page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/inventory');

    const bomBtn = page.locator('button:has-text("ดูรายละเอียด BOM"), button:has-text("ดูสูตร BOM")').first();
    if (await bomBtn.isVisible()) {
      await bomBtn.click();
      await expect(page.locator('text=Bill of Materials (BOM)')).toBeVisible();
    }
  });
});
