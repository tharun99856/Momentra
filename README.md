# Momentra

Photo and video tool for college clubs. Members upload media to events, browse the gallery, find pictures of themselves, and react to other people's uploads.

Submission for the competition.

## What's in here

| | |
|---|---|
| Source code | this repo |
| Architecture writeup | `docs/ARCHITECTURE.docx` |
| Database schema | `docs/DATABASE.docx` |
| Slide deck | `Momentra.pptx` |
| Docker setup | `docker-compose.yml`, `Dockerfile.*`, `nginx.conf` |
| CI | `.github/workflows/ci.yml` |
| Live demo + video | in the submission form |

## What it does

- Events. Clubs make events, members browse them with category and date filters.
- Upload. Drag and drop, compresses in the browser before sending, per-file progress.
- Gallery. Masonry layout per event. Photo viewer with likes and comments.
- Search. Postgres full-text over events and media (tags, captions, names).
- My photos. The photos you appear in.
- Favourites. A list you save for yourself.
- Share. Copy link to any photo.
- Download. Sharp overlays a watermark on the original at request time, based on who's downloading.

## Stack

React 18 + Vite + TypeScript on the front. Express on Node 20 in the back. PostgreSQL with Prisma. Sharp for image processing. RS256 JWT with an httpOnly refresh cookie for auth.

Styling is CSS Modules (we didn't want a runtime, didn't have enough screens to justify Tailwind). State is Zustand for auth, TanStack Query for everything server-owned. Storage is the local filesystem behind a four-function module that's swappable for S3 if needed.

## Running it

You need Node 20 and Postgres 14+.

```bash
npm install

cp server/.env.example server/.env
# put your DATABASE_URL in server/.env

cd server
npx prisma migrate dev
npm run db:seed
cd ..

npm run dev
# client at http://localhost:5173
# api    at http://localhost:3000
```

Seeded demo accounts:

| Email | Password | Role |
|---|---|---|
| admin@frame.dev | admin123 | global admin |
| photographer@frame.dev | password123 | club photographer |
| member@frame.dev | password123 | club member |

Or `docker compose up --build` if that's easier.

## Architecture in one diagram

```
Browser  ->  React SPA  ->  Express API  ->  PostgreSQL
                                  |
                                  v
                          uploads/ (local FS, or S3 in prod)
```

Upload, auth, and gallery sequence diagrams are in `docs/ARCHITECTURE.docx`.

## Layout

```
client/src/
  pages/         one file per route
  components/    events, gallery, social, upload, plus RouteGuard
  layouts/       AppLayout (sidebar + content)
  stores/        zustand, just auth
  lib/           api-client, query-client
  styles/        tokens + global

server/src/
  routes/        auth, clubs, events, media, social, search, users
  services/      stuff that didn't belong in a route handler
  middleware/    auth + security
  lib/           prisma, keys, paths, storage, image-processor, errors
  prisma/        schema, migrations, seed
```

## Decisions worth calling out

**RS256 JWT, 15-min access token, 7-day refresh.** Refresh tokens are rows in `refresh_tokens` so logout actually revokes. The access token stays in memory and never touches localStorage.

**Image variants generated on upload.** Sharp makes a compressed JPEG plus 200px and 600px thumbnails as part of the upload request. The gallery serves the compressed version. Originals only come back at download time.

**Postgres FTS instead of Elasticsearch.** `tsvector` columns on events and media, trigger-maintained, GIN-indexed. Fast enough for our scale and one less moving piece.

**Watermark at download time.** Sharp overlays text on the original when the user hits download. Members see club + event. Photographers get a credit line. Nothing pre-rendered leaks.

**Four-function storage abstraction.** `uploadFile`, `getFileBuffer`, `deleteFiles`, `getMediaUrl`. Writes to disk today. Pointing it at S3 is a one-file change.

## What we tried and dropped

The first version had a notification inbox, a Socket.io realtime layer, an admin moderation dashboard, and an ML worker for face detection. We pulled them before submitting.

- ML face recognition. Schema is ready (`face_descriptor`, `face_ids`) but we didn't get the worker stable. Phase two.
- Socket.io. TanStack Query's refetch-on-focus did the job without it.
- Notification inbox. Table is still there, the UI is not.
- Admin dashboard. The seeded admin uses the regular endpoints.

Keeping them in would have made the demo busier without making it better.

## License

MIT
