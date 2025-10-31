import type { APIRequestContext } from '@playwright/test';

// Types from your backend models
interface Producto {
  _id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  precio: number;
  precioCompra: number;
  stock: number;
}

interface Empleado {
  _id: string;
  email: string;
  nombre: string;
  apellidos: string;
  dni: string;
  rol: string;
  nombreCompleto?: string; // Virtual field
}

export class TestHelper {
  constructor(private adminAPI: APIRequestContext) {}

  async createTestProduct(product: Partial<Producto> = {}): Promise<Producto> {
    const defaultProduct = {
      codigo: `TEST-${Date.now()}`,
      nombre: 'Producto Test',
      categoria: 'alimentos',
      precio: 100,
      precioCompra: 80,
      stock: 100,
      ...product
    };

    const response = await this.adminAPI.post('/api/productos', {
      data: defaultProduct
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test product: ${await response.text()}`);
    }

    return await response.json();
  }

  async createTestEmployee(employee: Partial<Empleado> = {}): Promise<Empleado> {
    const defaultEmployee = {
      email: `test${Date.now()}@test.com`,
      nombre: 'Test',
      apellidos: 'User',
      dni: `${Date.now()}T`,
      rol: 'cajero',
      password: 'test1234',
      ...employee
    };

    const response = await this.adminAPI.post('/api/empleados', {
      data: defaultEmployee
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test employee: ${await response.text()}`);
    }

    return await response.json();
  }

  async cleanup() {
    // Delete test products
    const productsResponse = await this.adminAPI.get('/api/productos');
    if (productsResponse.ok()) {
      const products = await productsResponse.json();
      for (const product of products) {
        if (product.codigo.startsWith('TEST-')) {
          await this.adminAPI.delete(`/api/productos/${product._id}`);
        }
      }
    }

    // Delete test employees
    const employeesResponse = await this.adminAPI.get('/api/empleados');
    if (employeesResponse.ok()) {
      const employees = await employeesResponse.json();
      for (const employee of employees) {
        if (employee.email.includes('test') && employee.email.includes('@test.com')) {
          await this.adminAPI.delete(`/api/empleados/${employee._id}`);
        }
      }
    }
  }
}

export const createTestHelper = (adminAPI: APIRequestContext) => new TestHelper(adminAPI);