# Mercadona - Supermercado con IA

Resumen del trabajo realizado (hasta 31/10/2025)

Este repositorio contiene una aplicación POS + backend para la gestión de un supermercado. En esta rama se ha avanzado con foco en el control de expiraciones y trazabilidad de lotes.

Principales entregables implementados

- Backend (Express + Mongoose):
  - Modelos nuevos: `Batch` y `ExpirationAlert` en `backend/models/`.
  - Endpoints: `GET /api/expirations`, `GET /api/expirations/alerts`, `POST /api/expirations/scan` montados en `backend/routes/expirations.routes.js`.
  - Job one-shot: `backend/jobs/expirationJob.js` que corre el escaneo y upserta alertas.
  - Integración con ventas: `Venta` ahora admite `items.batch` y `items.batchCode`. Al crear/cancelar una venta se decrementa/restaura `Batch.quantityRemaining` y `Producto.stockActual`.
  - Middleware/soporte: `auth` y roles para proteger el endpoint de escaneo.

- Auditoría y trazabilidad:
  - Audit model/middleware para registrar eventos clave (stock, compras, ventas).

- Infraestructura de pruebas:
  - E2E skeleton con Playwright en `backend/tests/e2e` (fixtures y tests de ejemplo).

Comandos útiles (PowerShell)

1) Instalar dependencias y arrancar backend en desarrollo:

```powershell
cd .\backend
npm install
copy .env.example .env  # o crea .env con MONGODB_URI
npm run dev
```

2) Ejecutar el job de escaneo (one-shot):

```powershell
cd .\backend
npm run scan-expirations
```

3) Servir frontend (estático) para pruebas rápidas:

```powershell
cd ..
npx http-server -p 3000 -c-1
# abrir http://localhost:3000
```

Problemas conocidos y recomendaciones

- Variable de entorno faltante: `MONGODB_URI`.
  - El servidor falla si `MONGODB_URI` no está definida. Asegúrate de crear `backend/.env` con la cadena de conexión.

- `node_modules` comprometidos en `backend`.
  - Nota: durante el desarrollo se añadieron `backend/node_modules/` en un commit. Recomiendo eliminarlo del historial y añadir `node_modules` a `.gitignore` para mantener el repo pequeño. Opciones:
    - `git rm -r --cached backend/node_modules` + commit.
    - Para limpiar el historial remotamente (si ya fue empujado): usar BFG o `git filter-repo` (operación más invasiva).

- Advertencias de Mongoose sobre índices duplicados.
  - Algunas esquemas muestran warnings de índices duplicados; conviene revisarlos para evitar warnings en tiempo de ejecución.

- Puerto 5000 en uso / conflictos locales.
  - Si recibes EADDRINUSE, identifica el proceso y mátalo (Windows): `netstat -aon | findstr :5000` y `taskkill /PID <pid> /F`.

Qué falta y próximos pasos recomendados

1) Limpieza Git: remover `node_modules` del repo y añadir `.gitignore`.
2) Automatizar el job diario: añadir `node-cron` o programar una tarea en el servidor/cron para ejecutar `scan-expirations` cada día.
3) Notificaciones: integrar WebSocket/SSE para notificaciones en tiempo real y opcionalmente email/SMS.
4) Frontend: implementar vistas para expiraciones (heatmap, lista "soon-to-expire", popovers de lote con acciones).
5) Tests: añadir tests (unit/integration) y CI (GitHub Actions) para validar builds y E2E.

Contacto / notas

exemetal@hotmail.com   Exepaginasweb.com

---
Archivo generado automáticamente por la sesión de desarrollo del equipo.
