// Helper functions for test setup and common operations
import { test as base, expect } from '@playwright/test';
import type { Page, APIRequestContext } from '@playwright/test';

// Extend basic test with custom fixtures
type TestFixtures = {
  adminAPI: APIRequestContext;
  cashierAPI: APIRequestContext;
  posPage: Page;
};

export const test = base.extend<TestFixtures>({
  // API context with admin credentials
  adminAPI: async ({ request }, use) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: process.env.ADMIN_EMAIL || 'gerente@test.com',
        password: process.env.ADMIN_PASSWORD || 'test1234'
      }
    });
    const { token } = await response.json();
    const context = request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
      },
    });
    await use(context);
  },

  // API context with cashier credentials
  cashierAPI: async ({ request }, use) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: process.env.CASHIER_EMAIL || 'cajero@test.com',
        password: process.env.CASHIER_PASSWORD || 'test1234'
      }
    });
    const { token } = await response.json();
    const context = request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
      },
    });
    await use(context);
  },

  // Pre-authenticated POS page
  posPage: async ({ page }, use) => {
    // Login as cashier
    await page.goto('/');
    await page.locator('input[name="email"]').fill(process.env.CASHIER_EMAIL || 'cajero@test.com');
    await page.locator('input[name="password"]').fill(process.env.CASHIER_PASSWORD || 'test1234');
    await page.locator('button[type="submit"]').click();
    
    // Wait for POS screen
    await page.waitForSelector('[data-testid="pos-screen"]');
    
    await use(page);
  },
});

export { expect };