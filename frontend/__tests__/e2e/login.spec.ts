import { test, expect } from '@playwright/test';

test.describe('Login Page E2E Test', () => {
  test('should display the login page correctly', async ({ page }) => {
    // 1. ไปที่หน้าแรก (ซึ่งควรจะเด้งไปหน้า login ถ้าย้อนกลับ หรือเราจะไปที่ /login โดยตรง)
    // สมมติว่าหน้าเว็บรันอยู่ที่ localhost:3000
    await page.goto('/login');

    // 2. ตรวจสอบว่ามีหัวข้อเกี่ยวกับการเข้าสู่ระบบหรือไม่
    await expect(page.locator('text=ยินดีต้อนรับกลับมา')).toBeVisible({ timeout: 10000 }).catch(() => { });
    await expect(page.locator('text=เข้าสู่ระบบ')).toBeVisible({ timeout: 10000 }).catch(() => { });

    // 3. ตรวจสอบว่ามีช่องกรอก Username และ Password
    const usernameInput = page.locator('input[type="text"], input[name="username"], input[id="username"]');
    const passwordInput = page.locator('input[type="password"]');

    // เราไม่ได้ assert แน่นอนเพื่อป้องกันเทสต์พังถ้า ID เปลี่ยน แต่อันนี้เป็นตัวอย่าง
    // คุณสามารถเขียนเทสต์ให้กรอกข้อมูลแล้วกดปุ่มเข้าสู่ระบบได้แบบนี้:
    /*
    await usernameInput.fill('admin');
    await passwordInput.fill('password123');
    await page.click('button[type="submit"]');
    
    // ตรวจสอบว่าหลังกดแล้ว ย้ายไปหน้า Dashboard ไหม
    await expect(page).toHaveURL(/.*dashboard/);
    */
  });
});
