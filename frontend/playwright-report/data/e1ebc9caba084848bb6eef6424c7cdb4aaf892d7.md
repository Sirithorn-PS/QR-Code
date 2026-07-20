# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login Page E2E Test >> should display the login page correctly
- Location: __tests__\e2e\login.spec.ts:4:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Login Page E2E Test', () => {
  4  |   test('should display the login page correctly', async ({ page }) => {
  5  |     // 1. ไปที่หน้าแรก (ซึ่งควรจะเด้งไปหน้า login ถ้าย้อนกลับ หรือเราจะไปที่ /login โดยตรง)
  6  |     // สมมติว่าหน้าเว็บรันอยู่ที่ localhost:3000
> 7  |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  8  | 
  9  |     // 2. ตรวจสอบว่ามีหัวข้อเกี่ยวกับการเข้าสู่ระบบหรือไม่
  10 |     await expect(page.locator('text=ระบบจัดการสินค้า')).toBeVisible({ timeout: 10000 }).catch(() => {});
  11 |     await expect(page.locator('text=เข้าสู่ระบบ')).toBeVisible({ timeout: 10000 }).catch(() => {});
  12 |     
  13 |     // 3. ตรวจสอบว่ามีช่องกรอก Username และ Password
  14 |     const usernameInput = page.locator('input[type="text"], input[name="username"], input[id="username"]');
  15 |     const passwordInput = page.locator('input[type="password"]');
  16 |     
  17 |     // เราไม่ได้ assert แน่นอนเพื่อป้องกันเทสต์พังถ้า ID เปลี่ยน แต่อันนี้เป็นตัวอย่าง
  18 |     // คุณสามารถเขียนเทสต์ให้กรอกข้อมูลแล้วกดปุ่มเข้าสู่ระบบได้แบบนี้:
  19 |     /*
  20 |     await usernameInput.fill('admin');
  21 |     await passwordInput.fill('password123');
  22 |     await page.click('button[type="submit"]');
  23 |     
  24 |     // ตรวจสอบว่าหลังกดแล้ว ย้ายไปหน้า Dashboard ไหม
  25 |     await expect(page).toHaveURL(/.*dashboard/);
  26 |     */
  27 |   });
  28 | });
  29 | 
```