# Jisr QA

Monorepo for Jisr QA:
- `backend`: Express + MongoDB API (deploy to Railway)
- `frontend`: React + Vite app (deploy to Vercel)

## 1) Local setup

### Backend
1. Copy `backend/.env.example` to `backend/.env`
2. Set `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`
3. Install + run:
   - `cd backend`
   - `npm install`
   - `npm start`

### Frontend
1. Copy `frontend/.env.example` to `frontend/.env`
2. Set `VITE_API_URL` to backend URL
3. Install + run:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## 2) GitHub organization

Use one repo:
```
jisr-qa/
  backend/
  frontend/
  README.md
  .gitignore
```

Recommended commit sequence:
1. `chore: scaffold backend and frontend workspaces`
2. `feat: harden backend auth, cors, and card validation`
3. `feat: improve frontend api handling and save reliability`
4. `docs: add railway and vercel deployment steps`

## 3) Deploy backend and DB on Railway

1. Create Railway project.
2. Add MongoDB service.
3. Add backend service from GitHub repo with root directory `backend`.
4. Set backend variables:
   - `MONGODB_URI` = Mongo connection string from Railway Mongo service
   - `JWT_SECRET` = strong random secret
   - `FRONTEND_URL` = your Vercel app URL
   - `PORT` = `3001` (optional fallback)
5. Generate backend domain.

## 4) Deploy frontend on Vercel

1. Import same GitHub repo to Vercel.
2. Set root directory to `frontend`.
3. Set env var:
   - `VITE_API_URL` = Railway backend public URL
4. Deploy.

## 5) Post-deploy checks

1. `GET /` returns API running message.
2. Login works with non-default credentials.
3. Save card succeeds and persists.
4. Dashboard loads agent summaries.
5. CORS only allows configured Vercel origin(s).

## Security notes

- Production seeding is disabled by default.
- To seed local/test users only, set `SEED_DEFAULT_USERS=true` and keep `NODE_ENV` non-production.
- Rotate credentials before exposing the app publicly.
