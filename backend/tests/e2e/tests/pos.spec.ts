import { test, expect } from '@playwright/test';
import { test as baseTest } from './fixtures';

test.describe('POS System Login', () => {
  test('should allow cashier login', async ({ page }) => {
    // Go to login page
    await page.goto('/');

    // Fill login form
    await page.fill('input[name="email"]', 'cajero@test.com');
    await page.fill('input[name="password"]', 'test1234');
    
    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirect to POS screen
    await expect(page.locator('[data-testid="pos-screen"]')).toBeVisible();
  });
});

test.describe('POS Operations', () => {
  const test = baseTest;

  test('should be able to search for products', async ({ posPage }) => {
    // Search for a product
    await posPage.fill('[data-testid="product-search"]', 'Harina');
    
    // Wait for search results
    const products = posPage.locator('[data-testid="product-list"] > div');
    await expect(products).toHaveCount(await products.count());
    expect(await products.count()).toBeGreaterThan(0);
  });

  test('should be able to add products to cart', async ({ posPage }) => {
    // Search and add a product
    await posPage.fill('[data-testid="product-search"]', 'Harina');
    await posPage.click('[data-testid="product-list"] div >> text=Harina');
    
    // Verify product is in cart
    await expect(posPage.locator('[data-testid="cart-items"]')).toContainText('Harina');
  });

  test('should calculate correct total with taxes', async ({ posPage }) => {
    // Add a product with known price
    await posPage.fill('[data-testid="product-search"]', 'Harina');
    await posPage.click('[data-testid="product-list"] div >> text=Harina');
    
    // Get subtotal and total
    const subtotalText = await posPage.locator('[data-testid="cart-subtotal"]').textContent();
    const totalText = await posPage.locator('[data-testid="cart-total"]').textContent();
    
    if (!subtotalText || !totalText) {
      throw new Error('Could not find subtotal or total values');
    }
    
    // Parse numeric values (remove currency symbol and convert to number)
    const subtotal = parseFloat(subtotalText.replace('€', '').trim());
    const total = parseFloat(totalText.replace('€', '').trim());
    
    // Verify total includes 21% IVA
    expect(total).toBeCloseTo(subtotal * 1.21, 2);
  });

  test('should complete a cash payment', async ({ posPage }) => {
    // Add a product
    await posPage.fill('[data-testid="product-search"]', 'Harina');
    await posPage.click('[data-testid="product-list"] div >> text=Harina');
    
    // Go to payment
    await posPage.click('[data-testid="proceed-to-payment"]');
    
    // Select cash payment
    await posPage.click('[data-testid="payment-method-cash"]');
    
    // Enter received amount (higher than total)
    const totalText = await posPage.locator('[data-testid="payment-total"]').textContent();
    if (!totalText) {
      throw new Error('Could not find payment total');
    }
    const total = parseFloat(totalText.replace('€', '').trim());
    await posPage.fill('[data-testid="cash-received"]', (total + 10).toString());
    
    // Complete payment
    await posPage.click('[data-testid="complete-payment"]');
    
    // Verify success and change amount
    await expect(posPage.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(posPage.locator('[data-testid="change-amount"]')).toContainText('10,00');
  });
});