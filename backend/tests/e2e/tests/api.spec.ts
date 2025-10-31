import { test, expect } from '@playwright/test';
import { test as baseTest } from './fixtures';
import { createTestHelper } from './helpers';

test.describe('Inventory Management API', () => {
  const test = baseTest;
  let helper: ReturnType<typeof createTestHelper>;

  test.beforeAll(async ({ adminAPI }) => {
    helper = createTestHelper(adminAPI);
  });

  test.afterAll(async () => {
    await helper.cleanup();
  });

  test('should create and retrieve products', async ({ adminAPI }) => {
    // Create a test product
    const product = await helper.createTestProduct({
      nombre: 'Galletas Test',
      precio: 150
    });

    // Verify product was created
    const response = await adminAPI.get(`/api/productos/${product._id}`);
    expect(response.ok()).toBeTruthy();

    const retrievedProduct = await response.json();
    expect(retrievedProduct).toMatchObject({
      nombre: 'Galletas Test',
      precio: 150
    });
  });

  test('should update product stock', async ({ adminAPI }) => {
    // Create initial product
    const product = await helper.createTestProduct({
      stock: 100
    });

    // Update stock
    const updateResponse = await adminAPI.patch(`/api/productos/${product._id}`, {
      data: {
        stock: 80
      }
    });
    expect(updateResponse.ok()).toBeTruthy();

    // Verify stock was updated
    const response = await adminAPI.get(`/api/productos/${product._id}`);
    const updatedProduct = await response.json();
    expect(updatedProduct.stock).toBe(80);
  });

  test('should handle low stock alerts', async ({ adminAPI }) => {
    // Create product with low stock
    const product = await helper.createTestProduct({
      stock: 5 // Assuming your system has a low stock threshold
    });

    // Get product status
    const response = await adminAPI.get(`/api/productos/${product._id}/status`);
    expect(response.ok()).toBeTruthy();

    const status = await response.json();
    expect(status.stockStatus).toBe('bajo');
  });
});

test.describe('Employee Management', () => {
  const test = baseTest;
  let helper: ReturnType<typeof createTestHelper>;

  test.beforeAll(async ({ adminAPI }) => {
    helper = createTestHelper(adminAPI);
  });

  test.afterAll(async () => {
    await helper.cleanup();
  });

  test('should create cashier employee', async ({ adminAPI }) => {
    const employee = await helper.createTestEmployee({
      rol: 'cajero',
      nombre: 'Juan',
      apellidos: 'Test'
    });

    expect(employee.rol).toBe('cajero');
    expect(employee.nombreCompleto).toBe('Juan Test');
  });

  test('cashier should have limited permissions', async ({ adminAPI }) => {
    const employee = await helper.createTestEmployee({
      rol: 'cajero'
    });

    const response = await adminAPI.get(`/api/empleados/${employee._id}/permisos`);
    expect(response.ok()).toBeTruthy();

    const permisos = await response.json();
    expect(permisos).toContain('vender');
    expect(permisos).not.toContain('administrar');
  });
});