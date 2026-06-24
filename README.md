# Monorepo (frontend + backend)

Overview:
- Frontend: Next.js with Tailwind CSS (shadcn UI can be added via its generator)
- Backend: Node + TypeScript + Prisma (configured for Supabase/Postgres)

Quick start:

Install dependencies (yarn is recommended):

```bash
yarn install
yarn dev:frontend
yarn dev:backend
```

Env files:
- Copy `backend/.env.example` to `backend/.env` and fill your Supabase `DATABASE_URL` and keys.
