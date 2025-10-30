## Purpose

This file gives concise, project-specific guidance for AI coding agents working on the "Mercadona Supermercad con IA" repository. Focus on actionable patterns, key places to read, and small examples that show how this project wires logic together.

## Big-picture architecture (what to read first)
- Frontend: static UI in the repo root — `index.html`, `app.js`, `style.css`, and the POS UI in `terminal.html`/`terminal.js`.
- Backend: an Express + MongoDB API in `backend/` with entry `backend/server.js` and models under `backend/models/` (see `Cliente.model.js`, `Empleado.model.js`, `Producto.model.js`, `Venta.model.js`).
- Routes are mounted in `server.js` (e.g. `/api/productos`, `/api/ventas`, `/api/ia`, `/api/auth`) — follow this file when adding new endpoints.

Why this matters: backend models use Mongoose schemas with virtuals, indexes and `pre('save')` hooks; changes to a model often require updates to indexes and any code that constructs or expects specific fields (e.g. `Venta.numeroTicket`).

## Key integration points and dependencies
- Environment: `dotenv` is used; check `process.env.MONGODB_URI`, `PORT`, and `NODE_ENV` inside `backend/server.js`.
- AI integration: `openai` and `axios` are installed in `backend/package.json` and an `/api/ia` route is present — inspect `backend/routes/ia.routes.js` (and corresponding controllers) before modifying AI-related code.
- Auth: `jsonwebtoken`, `bcryptjs` are used; `Empleado` schema hashes passwords in a `pre('save')` hook and marks `password` as `select: false`.

## Project-specific conventions and patterns (do not assume default behavior)
- Spanish naming and messages: code and error messages are Spanish (e.g., `El nombre es obligatorio`). Keep this consistent in new messages and API responses.
- Mongoose patterns:
  - Virtuals are commonly used (`nombreCompleto`, `margenGanancia`, `estadoStock`). Preserve `toJSON`/`toObject` virtuals when returning docs.
  - `pre('save')` hooks implement important domain logic: `Empleado` hashes passwords; `Venta` auto-generates `numeroTicket` using the latest saved `Venta`. If you change ticket format, update any code that parses it.
  - Indexes are explicitly defined in models (email, dni, codigo, createdAt). When adding queries, prefer using these indexed fields.
- Roles & permissions: `Empleado.rol` has an enum and the default `permisos` are computed from the role. Use the role enum values (`gerente`, `cajero`, `reponedor`, `supervisor`, etc.) when creating seeds or tests.

## Common developer workflows and commands
Open a terminal in `backend/` to run backend tasks:

 - Install and run in dev: `cd backend; npm install; npm run dev` (uses `nodemon server.js`)
 - Start production server: `cd backend; npm start` (runs `node server.js`)
 - Tests: `cd backend; npm test` (Jest listed in devDependencies; repository may not include tests yet).

When opening the backend, copy `backend/.env.example` to `backend/.env` and fill in values (do not commit `.env`). Ensure `MONGODB_URI` and any `OPENAI_API_KEY`/AI-related keys are set before running.

## Examples and quick recipes (copyable patterns)
- Add a new API route:
  1. Create `backend/routes/mything.routes.js` exporting an Express `Router()`.
  2. Implement controller logic in `backend/controllers/` (follow existing patterns in `/routes/` and `server.js`).
  3. Mount it in `backend/server.js` (e.g. `app.use('/api/mything', mythingRoutes);`).

- Create a product document (fields required):
  - `codigo`, `nombre`, `categoria` (enum: `alimentos|bebidas|...`), `precio`, `precioCompra`, `stock`.

- When modifying `Venta` logic: keep `numeroTicket` generation in mind — `ventaSchema.pre('save')` reads the last `Venta` to increment the sequence. Changing this may require migration or re-indexing.

- ## Safety, tests and PR checklist for AI changes
- Run `npm run dev` in `backend/` and confirm server starts and prints the `Conectado a MongoDB` message.
- See also `.github/PR_CHECKLIST.md` for a short runtime checklist to include in PR descriptions.
- If you change schemas, update indexes and consider a DB migration for production data.
- Keep API messages and variable names in Spanish to match existing code.
- If you touch auth, verify: password hashing still works (`Empleado.pre('save')`) and login routes use `jsonwebtoken` for token creation/validation.

## Where to look for more context
- `backend/server.js` — route registration, env usage, error middleware.
- `backend/package.json` — scripts and important dependencies (OpenAI, mongoose, jwt).
- `backend/models/*.js` — canonical examples of Mongoose patterns used across the project.
- Frontend files (`index.html`, `app.js`, `terminal.html`, `terminal.js`) — help understand expected API shapes and UX flows.

## Concrete routes & examples (discovered)

Note: `backend/server.js` mounts the following route modules: `productos`, `ventas`, `clientes`, `empleados`, `ia`, `dashboard`, `auth` (see `app.use('/api/...')`).

This workspace now includes scaffolded route and controller implementations for the core resources and a minimal JWT middleware. Files created as a starting point:

- Routes:
  - `backend/routes/productos.routes.js` (GET /, POST /)
  - `backend/routes/ventas.routes.js` (GET /, POST /)
  - `backend/routes/clientes.routes.js` (GET /, POST /)
  - `backend/routes/empleados.routes.js` (GET /, POST /)
  - `backend/routes/auth.routes.js` (POST /login)

- Controllers:
  - `backend/controllers/productos.controller.js`
  - `backend/controllers/ventas.controller.js`
  - `backend/controllers/clientes.controller.js`
  - `backend/controllers/empleados.controller.js`
  - `backend/controllers/auth.controller.js`

- Middleware:
  - `backend/middleware/auth.js` — verifies `Authorization: Bearer <token>` and attaches `req.user` (payload contains `{ id, email, rol }`).

  Additional helpers and middleware added:

  - `backend/middleware/roles.js` — `requireRole(role)` helper to restrict endpoints by user role (e.g., `requireRole('gerente')`).
  - `backend/scripts/seed-products.js` — seed script to create sample products (idempotent by `codigo`).

Design notes:
- POST routes for `productos`, `ventas`, `clientes`, and `empleados` are protected with the JWT middleware. Use the `auth` route to obtain a token (`/api/auth/login`).
- The JWT uses `process.env.JWT_SECRET` (fallback `devsecret`). Set `JWT_SECRET` in `backend/.env` for production.
- Creating `empleados` and other administrative operations should be further restricted by role (e.g., only `gerente`). The middleware attaches `req.user.rol` which you can use for role-based checks.

Below are concrete example request shapes based on the Mongoose models found in `backend/models/*.js` and the expected API semantics.

1) Productos

- GET list (example):

  GET /api/productos

- POST create product (body JSON):

  ```json
  {
    "codigo": "P-001",
    "nombre": "Harina 1kg",
    "categoria": "alimentos",
    "precio": 150.00,
    "precioCompra": 100.00,
    "stock": 50
  }
  ```

  cURL example:

  ```bash
  curl -X POST http://localhost:5000/api/productos \
    -H "Content-Type: application/json" \
    -d '{"codigo":"P-001","nombre":"Harina 1kg","categoria":"alimentos","precio":150,"precioCompra":100,"stock":50}'
  ```

2) Auth (login)

- Expected: POST /api/auth/login (email + password) returns JWT

  Request body example:

  ```json
  { "email": "cajero@example.com", "password": "password123" }
  ```

  cURL example:

  ```bash
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"cajero@example.com","password":"password123"}'
  ```

3) Ventas (crear venta)

- POST /api/ventas — body should follow `Venta` model shape. Minimal example (the server generates `numeroTicket`):

  ```json
  {
    "items": [
      { "producto": "<productoObjectId>", "nombreProducto": "Harina 1kg", "cantidad": 2, "precioUnitario": 150, "subtotal": 300 }
    ],
    "subtotal": 300,
    "iva": 21,
    "impuestos": 63,
    "total": 363,
    "metodoPago": "efectivo",
    "detallesPago": { "efectivo": 400, "cambio": 37 },
    "empleado": "<empleadoObjectId>",
    "cliente": null
  }
  ```

  cURL example:

  ```bash
  curl -X POST http://localhost:5000/api/ventas \
    -H "Content-Type: application/json" \
    -d '{"items":[{"producto":"<productoId>","nombreProducto":"Harina 1kg","cantidad":2,"precioUnitario":150,"subtotal":300}],"subtotal":300,"iva":21,"impuestos":63,"total":363,"metodoPago":"efectivo","detallesPago":{"efectivo":400,"cambio":37},"empleado":"<empleadoId>"}'
  ```

Tips when using these examples:
- Replace `<productoId>` and `<empleadoId>` with real ObjectId strings from your database (or adapt the API to accept `codigo` instead).
- Auth endpoints typically return a JWT to be sent as `Authorization: Bearer <token>` for protected routes (productos POST, ventas POST). If auth middleware exists, include the header.

## If something's unclear
- Ask for any missing environment values (MONGODB_URI, OPENAI API keys), or if you need to run the server locally ask for a sample `.env` template.
- If you plan to change data shapes that affect the frontend, include small migration steps and update the examples in `app.js` / `terminal.js`.

---
If you'd like, I can next:

- (A) Add role-based middleware and apply role checks to sensitive endpoints (recommended).
- (A) Add role-based middleware and apply role checks to sensitive endpoints (recommended). Example: POST `/api/productos` and POST `/api/empleados` require `gerente` role.
- (B) Create a small GitHub Action to run `npm install` and `npm test` for `backend/` on PRs.
- (C) Run a local verification (install deps + start dev server) if you confirm and provide a working `backend/.env` (or allow a simulated dry-run).

Tell me which of the above you prefer and I'll proceed.
