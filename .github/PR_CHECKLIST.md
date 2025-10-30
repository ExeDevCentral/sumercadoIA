# PR checklist — runtime and safety checks

Before opening a PR, run the relevant local checks below and add results to the PR description.

- [ ] Install dependencies inside `backend/`:

```powershell
cd backend; npm install
```

- [ ] Create `backend/.env` from `backend/.env.example` and confirm sensitive values are set (do not commit `.env`).

- [ ] Start the dev server and confirm MongoDB connection message:

```powershell
cd backend; npm run dev
# Expect: ✅ Conectado a MongoDB and 🚀 Servidor corriendo en puerto <PORT>
```

- [ ] Run tests (if present):

```powershell
cd backend; npm test
```

- [ ] Smoke test main API endpoints (example):

  - GET / -> returns JSON with endpoints
  - GET /api/productos -> 200 or empty array
  - POST /api/auth/login -> (if auth implemented) returns token on valid creds

- [ ] If you modified Mongoose schemas, list required index changes or migration steps in the PR.

- [ ] Keep user-facing messages and variable names in Spanish to match project conventions.

- [ ] Ensure no secrets were committed. If a secret was accidentally committed, rotate it and update the PR with the mitigation steps.
