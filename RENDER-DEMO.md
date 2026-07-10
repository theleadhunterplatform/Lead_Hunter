# Temporary demo deploy on Render

One platform, one URL for the client. Frontend + backend + database + Redis.

**Time:** ~30–45 minutes  
**Cost:** ~$15–25/mo if you use Starter plans (recommended so the demo does not sleep)

---

## Before you start

1. Push this repo to **GitHub** (Render deploys from Git).
2. Have an **Apify token** ready if the client will test scraping ([apify.com](https://apify.com) → Settings → Integrations).
3. Pick a **demo admin password** and share it with the client securely.

---

## Step 1 — Render account

1. Go to [render.com](https://render.com) → sign up with **GitHub**.
2. Allow Render to access the **Lead_Hunter** repository.

---

## Step 2 — PostgreSQL

1. Dashboard → **New +** → **PostgreSQL**
2. Name: `lead-hunter-db`
3. Region: choose closest to you (use **same region** for everything below)
4. Plan: **Free** for quick test, **Starter** if client needs reliable access
5. **Create Database**
6. Open the database → **Connections** → copy **Internal Database URL**

---

## Step 3 — Redis (Key Value)

1. **New +** → **Key Value**
2. Name: `lead-hunter-redis`
3. Same region as Postgres
4. **Create**
5. Copy **Internal Redis URL** (`redis://...`)

---

## Step 4 — Backend

1. **New +** → **Web Service** → connect **Lead_Hunter** repo
2. Settings:

| Field | Value |
|-------|--------|
| Name | `lead-hunter-api` |
| Region | Same as DB |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Starter** ($7) recommended |

3. **Environment** → add variables:

```env
NODE_ENV=production
ENV=production
DB_MODE=supabase
DATABASE_URL=<paste Internal Database URL>

REDIS_URL=<paste Internal Redis URL>
USE_CLOUD_REDIS=true

JWT_ACCESS_SECRET=<long random string>
JWT_REFRESH_SECRET=<another long random string>

ADMIN_EMAIL=demo@yourclient.com
ADMIN_PASSWORD=ChangeThisDemoPassword!
ADMIN_NAME=Demo Admin

APIFY_API_TOKEN=<your token, or leave empty for now>

FRONTEND_URL=https://lead-hunter-web.onrender.com
```

> `FRONTEND_URL` — use the name you will give the frontend service. You can fix it after Step 5 if the URL is different.

4. **Create Web Service** → wait for deploy to finish.

5. Open **Shell** tab and run:

```bash
npx prisma db push --schema prisma/schema.prisma
```

6. Test: open `https://lead-hunter-api.onrender.com/health` — should show `{"status":"OK",...}`

7. Copy your backend URL for the next step.

---

## Step 5 — Frontend

1. **New +** → **Web Service** → same repo
2. Settings:

| Field | Value |
|-------|--------|
| Name | `lead-hunter-web` |
| Region | Same as backend |
| Root Directory | `frontend` |
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Starter** recommended |

3. **Environment**:

```env
NEXT_PUBLIC_API_URL=https://lead-hunter-api.onrender.com/api
```

Replace with your real backend URL from Step 4.

4. **Create Web Service** → wait for build.

5. Copy the frontend URL (e.g. `https://lead-hunter-web.onrender.com`).

---

## Step 6 — Fix CORS

1. Go to **lead-hunter-api** → **Environment**
2. Set `FRONTEND_URL` to your **exact** frontend URL (no trailing slash):

```env
FRONTEND_URL=https://lead-hunter-web.onrender.com
```

3. Save → backend redeploys automatically.

---

## Step 7 — Give the client

| | |
|--|--|
| **URL** | `https://lead-hunter-web.onrender.com` |
| **Email** | value of `ADMIN_EMAIL` |
| **Password** | value of `ADMIN_PASSWORD` |

Optional: add Apify keys in the app under **Search Keys** before a scrape demo.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails | Check backend logs; confirm `prisma db push` ran |
| CORS / network error in browser | `FRONTEND_URL` must match the URL in the browser exactly |
| API not found | `NEXT_PUBLIC_API_URL` must end with `/api` — redeploy frontend after changing |
| Scrape does nothing | Check `REDIS_URL` and `USE_CLOUD_REDIS=true`; check Apify token |
| Very slow first load | Normal on free/cold start — use Starter plans for demos |

---

## Optional later — AI service

Only needed for OCR / AI training features.

1. **New +** → **Web Service** → Root: `ai`, Runtime: Python
2. Build: `pip install -r requirements.txt`
3. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Instance: **Standard (2 GB RAM)**
5. On backend set: `AI_SERVICE_URL=https://lead-hunter-ai.onrender.com`
6. Training uses **TF-IDF by default** (fast, works on free/starter). Optional: set `USE_EMBEDDINGS=true` only on **Standard (2 GB+)** if you want sentence-transformers.

---

## Tear down

When the demo is over: delete each service in Render dashboard to stop billing.
