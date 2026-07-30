import { test, expect } from '@playwright/test';

test.describe('Browser Errors & Network Audit', () => {
  const routesToTest = ['/login', '/', '/inventory', '/scan', '/transactions', '/reports'];

  routesToTest.forEach(route => {
    test(`Audit Browser Errors on route ${route}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: Array<{ url: string; status: number }> = [];

      // Listen to console messages
      page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
          consoleErrors.push(text);
        } else if (type === 'warning') {
          consoleWarnings.push(text);
        }
      });

      // Listen to page unhandled exceptions
      page.on('pageerror', err => {
        pageErrors.push(err.message || String(err));
      });

      // Listen to network responses for 4xx/5xx status
      page.on('response', response => {
        const status = response.status();
        if (status >= 400) {
          failedRequests.push({ url: response.url(), status });
        }
      });

      // Navigate to route
      await page.goto(route, { waitUntil: 'networkidle' });

      // Log findings
      console.log(`=== AUDIT ROUTE: ${route} ===`);
      console.log(`Console Errors (${consoleErrors.length}):`, consoleErrors);
      console.log(`Console Warnings (${consoleWarnings.length}):`, consoleWarnings);
      console.log(`Page Errors (${pageErrors.length}):`, pageErrors);
      console.log(`Failed API Requests (${failedRequests.length}):`, failedRequests);

      // Verify page loaded
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
