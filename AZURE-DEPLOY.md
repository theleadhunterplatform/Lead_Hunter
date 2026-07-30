# Azure backend — manual deploy cheat sheet

API URL: `https://<YOUR_VM_IP>.sslip.io`  
Health: `https://<YOUR_VM_IP>.sslip.io/health`  
Admin: see `.env` on the VM (do not commit credentials)

Pushing to GitHub does **not** update Azure. Use the steps below after every backend change.

---

## 1) SSH from your PC (PowerShell)

```powershell
cd "D:\work\Clients_work\Lead_Hunter"
ssh -i ".\lead-hunter-api_key.pem" azureuser@<YOUR_VM_IP>
```

---

## 2) Deploy latest backend on the VM (copy whole block)

```bash
cd ~/Lead_Hunter
git pull

cd backend
npm install --include=dev

DB_MODE=supabase npx prisma generate --schema prisma/schema.prisma
npx tsc

pm2 restart lead-hunter-api
pm2 status
curl -s https://<YOUR_VM_IP>.sslip.io/health
```

Expect health: `{"status":"OK",...}`

---

## 3) Only if Prisma / DB schema changed

```bash
cd ~/Lead_Hunter/backend

DATABASE_URL="postgresql://postgres.<project-ref>:<YOUR_DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres" npx prisma db push --schema prisma/schema.prisma

pm2 restart lead-hunter-api
```

---

## 4) Useful checks

```bash
pm2 status
pm2 logs lead-hunter-api --lines 30 --nostream
redis-cli ping
curl -s https://<YOUR_VM_IP>.sslip.io/health

curl -s -X POST https://<YOUR_VM_IP>.sslip.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<admin-password>"}'
```

---

## 5) Frontend guy (Vercel)

```text
NEXT_PUBLIC_API_URL=https://<YOUR_VM_IP>.sslip.io/api
```

Redeploy Production, then test https://leadhunterclub.vercel.app

Backend CORS should be:
```env
FRONTEND_URL=https://leadhunterclub.vercel.app
```

---

## Notes

- `.env` on the VM is not in Git — do not overwrite it with local `.env`
- Do not commit `lead-hunter-api_key.pem` or secrets
- Python OCR AI service is not deployed (optional)
- Deploy is **manual** (no auto-deploy yet)
