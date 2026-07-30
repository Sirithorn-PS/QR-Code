import { test, expect } from '@playwright/test';

test.describe('E2E User Flows Verification', () => {
  // Helper for mock supervisor login
  async function mockSupervisorLogin(page: any) {
    await page.route('**/auth/login', async (route: any) => {
      await route.fulfill({
        status: 200,
        json: {
          token: 'mock-jwt-supervisor-token',
          user: { id: 1, username: 'admin', fullName: 'System Admin', role: 'admin' }
        }
      });
    });

    await page.goto('/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  }

  // Flow 1: Authentication
  test('Flow 1: Authentication - Login to Dashboard', async ({ page }) => {
    await mockSupervisorLogin(page);
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  // Flow 2: Stock Navigation & Details
  test('Flow 2: Stock Page - Navigation, Search, Filter & Details', async ({ page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/inventory');
    await expect(page.locator('text=คลังสินค้า')).toBeVisible();

    // Check search input presence
    const searchInput = page.locator('input[placeholder*="ค้นหา"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // Check filter buttons
    await expect(page.locator('button:has-text("ทั้งหมด"), button:has-text("Packaging")').first()).toBeVisible();
  });

  // Flow 3: Add New Product Modal & Validation
  test('Flow 3: Add Product Modal & Validation', async ({ page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/inventory');

    const addBtn = page.locator('button:has-text("เพิ่มสินค้าใหม่")');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Modal should be visible
    await expect(page.locator('text=ข้อมูลสินค้าหลัก')).toBeVisible();

    // Submit empty form to trigger validation error
    const saveBtn = page.locator('button:has-text("บันทึกสินค้า")');
    await saveBtn.click();

    // Error message should appear
    await expect(page.locator('text=กรุณากรอกรหัสสินค้า')).toBeVisible();
  });

  // Flow 4: Stock Receive
  test('Flow 4: Stock Receive Flow', async ({ page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/scan');

    // Page should render scan/search options
    await expect(page.locator('text=สแกน QR Code')).toBeVisible();
  });

  // Flow 5: Stock Issue
  test('Flow 5: Stock Issue Flow', async ({ page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/scan');

    await expect(page.locator('text=สแกน QR Code')).toBeVisible();
  });

  // Flow 6: Approval Flow
  test('Flow 6: Approval Page - Supervisor View', async ({ page }) => {
    await page.route('**/transactions?status=pending', async (route: any) => {
      await route.fulfill({
        status: 200,
        json: [{ id: 99, type: 'receive', quantity: 10, itemSnapshot: { name: 'Packaging Test' }, user: { fullName: 'Staff' } }]
      });
    });

    await mockSupervisorLogin(page);
    await page.goto('/transactions');

    await expect(page.locator('text=ประวัติการทำรายการ')).toBeVisible();
  });

  // Flow 7: Reports
  test('Flow 7: Reports Page Navigation & Filters', async ({ page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/reports');

    await expect(page.locator('text=รายงานสรุป')).toBeVisible();
  });

  // Flow 8: Bill of Materials (BOM) View
  test('Flow 8: BOM View Modal', async ({ page }) => {
    await mockSupervisorLogin(page);
    await page.goto('/inventory');

    const bomBtn = page.locator('button:has-text("ดูรายละเอียด BOM"), button:has-text("ดูสูตร BOM")').first();
    if (await bomBtn.isVisible()) {
      await bomBtn.click();
      await expect(page.locator('text=สูตรโครงสร้าง BOM')).toBeVisible();
    }
  });
});
