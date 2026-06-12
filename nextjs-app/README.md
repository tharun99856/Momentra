# Momentra — Next.js 14 Full-Stack App

## What you need to run this

| Requirement | Free? | Notes |
|-------------|-------|-------|
| Node.js 18+ | ✅ Free | Already installed if you ran the old project |
| PostgreSQL database | ✅ Free | Local install OR free cloud (Neon/Supabase) |
| JWT key pair | ✅ Free | Generated locally, no service needed |
| Cloudinary | Optional | Only needed in production for file uploads. Dev uses local disk. |

---

## Setup (one time)

### Step 1 — Copy the env file
```bash
cd nextjs-app
copy .env.example .env.local
```

### Step 2 — Set your database URL
Open `.env.local` and set:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/momentra
```
**Or use free cloud Postgres:**
- Go to https://neon.tech → New project → copy the connection string
- Paste it as `DATABASE_URL=` in `.env.local`

### Step 3 — Generate JWT keys (automatic)
```bash
npm run setup
```
This writes `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` to `.env.local` automatically.

### Step 4 — Run database migrations
```bash
npm run db:generate
npm run db:migrate
```
When prompted for a migration name, type: `init`

### Step 5 — Seed demo data (optional)
```bash
npm run db:seed
```
Creates these accounts:
- `admin@frame.dev` / `admin123`
- `photographer@frame.dev` / `password123`
- `member@frame.dev` / `password123`

### Step 6 — Start dev server
```bash
npm run dev
```
Open http://localhost:3000

---

## File uploads in development
Files are stored in `nextjs-app/uploads/` on your disk.  
No Cloudinary account needed during development.

## File uploads in production (Vercel)
Set these 3 env vars in your Vercel project settings:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
Get them free at https://cloudinary.com (25 GB free tier).

## Deploy to Vercel
```bash
npm i -g vercel
vercel
```
Add all `.env.local` variables in the Vercel dashboard under Project → Settings → Environment Variables.

---

## Demo accounts (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@frame.dev | admin123 |
| Photographer | photographer@frame.dev | password123 |
| Member | member@frame.dev | password123 |
