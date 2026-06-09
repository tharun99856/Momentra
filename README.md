# Momentra

A photo and video management platform for college clubs. Members upload media to events, browse galleries, find their own photos, and react to other people's uploads.

> Built for [Competition Name] — submission package below.

---

## Deliverables

| Item | Location |
|---|---|
| Source code | this repository |
| Live demo | _link in submission form_ |
| Setup guide | [Quick start](#quick-start) below |
| Architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Database schema + ERD | [`docs/DATABASE.md`](docs/DATABASE.md) |
| API reference | [`docs/API.md`](docs/API.md) |
| Presentation outline | [`docs/PRESENTATION.md`](docs/PRESENTATION.md) |
| Demo video | _link in submission form_ |
| Docker setup | [`docker-compose.yml`](docker-compose.yml) |
| CI pipeline | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

---

## What it does

- **Events** — clubs create events; members browse a chronological list with filters
- **Upload** — drag-and-drop with client-side compression and live per-file progress
- **Gallery** — masonry layout per event, photo viewer with comments and likes
- **Search** — query photos by tag, uploader, or event (PostgreSQL `tsvector`)
- **My photos** — see media you appear in
- **Favourites** — save photos to your own list
- **Share** — copy a direct link to any photo
- **Watermarked download** — original photos are watermarked at download time based on the viewer's club role

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast HMR, strict types |
| Styling | CSS Modules | Scoped, greppable, zero runtime |
| State | Zustand (auth) + TanStack Query (server data) | Right tool per scope |
| Backend | Node.js 20 + Express | Familiar, small surface |
| DB / ORM | PostgreSQL + Prisma | Type-safe queries, native FTS |
| Image processing | Sharp | Generates compressed + thumbnails on upload |
| Auth | RS256 JWT + httpOnly refresh cookie | Short-lived access in memory, no localStorage exposure |
| Storage | Local filesystem (`server/uploads/`) | Single `storage.ts` module — swappable for S3 |

## Quick start

```bash
# Prerequisites: Node 20+, PostgreSQL 14+

# 1. Install
npm install

# 2. Configure
cp server/.env.example server/.env
#   set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/momentra

# 3. Database
cd server
npx prisma migrate dev
npm run db:seed
cd ..

# 4. Run
npm run dev
#   client → http://localhost:5173
#   api    → http://localhost:3000
```

### Demo accounts

| Email | Password | Role |
|---|---|---|
| `admin@frame.dev` | `admin123` | global admin |
| `photographer@frame.dev` | `password123` | club photographer |
| `member@frame.dev` | `password123` | club member |

### Or with Docker

```bash
docker compose up --build
```

Brings up Postgres, the API, and the client. Same demo accounts apply once seeded.

## Architecture (at a glance)

```
Browser ──HTTPS──► Vite/React SPA ──REST──► Express API ──SQL──► PostgreSQL
                                       └──fs──► uploads/ (local) or S3 (prod)
```

Full diagram with sequence flows: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Project layout

```
client/src/
  pages/         one file per route
  components/    events/ gallery/ social/ upload/ + RouteGuard
  layouts/       AppLayout (sidebar + content)
  stores/        zustand (auth only)
  lib/           api-client, query-client
  styles/        tokens.css + global.css

server/src/
  routes/        auth, clubs, events, media, social, search, users
  services/      auth, club, event, social (logic that didn't fit in a route handler)
  middleware/    auth, security
  lib/           prisma, keys, paths, storage, image-processor, errors
  types/         shared TS types
  prisma/        schema, migrations, seed
```

## Key engineering decisions

- **RS256 JWT, 15-min access + 7-day refresh** — refresh tokens are server-side rows so we can revoke. Access token never touches localStorage.
- **Image variants generated on upload** (Sharp): a compressed JPEG for the gallery, plus two thumbnails (200px / 600px). The gallery never serves originals.
- **Postgres full-text search** — `tsvector` columns on `events.search_vector` and `media.search_vector`, maintained by triggers. Avoids bringing in Elasticsearch for a single feature.
- **Watermarking on download** — the watermark text changes per viewer role (member vs photographer), applied server-side at request time so nothing pre-rendered leaks.
- **Storage abstraction** — `server/src/lib/storage.ts` has four functions (`uploadFile`, `getFileBuffer`, `deleteFiles`, `getMediaUrl`). Local FS today; S3 is one file change away.

## Tradeoffs and what was cut

- ML auto-tagging (face descriptors / content tags) — schema columns kept, no worker shipped
- Real-time updates via Socket.io — TanStack Query refetch on focus was sufficient
- Notification inbox — table exists, surfacing it as a feature is in the next phase
- AWS S3 + CloudFront signed URLs — interface exists, demo runs on local FS

These were prototyped, evaluated, and held back so the core flow stayed focused.

## License

MIT
