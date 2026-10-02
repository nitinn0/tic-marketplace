# TIC Marketplace

TIC Marketplace is a B2B marketplace for testing, inspection, certification, sustainability, ESG, consulting, and technical services.

This Phase 1 setup establishes a clean MVP foundation for a modular monolith with a Next.js frontend and NestJS backend, plus PostgreSQL connectivity via Prisma.

## Tech stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui-inspired UI primitives
- Backend: NestJS, TypeScript, Prisma ORM
- Database: PostgreSQL
- Local infrastructure: Docker Compose

## Project structure

```text
TIC/
├── frontend/              # Next.js application
├── backend/               # NestJS application
├── docker-compose.yml     # Local PostgreSQL container
├── .env.example           # Shared environment configuration template
├── .gitignore             # Repository ignore rules
├── README.md              # Project documentation
└── ...
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop or Docker Engine with Compose

## Environment variables

Copy the example file and adjust values as needed:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Example values:

```env
DATABASE_URL="postgresql://tic_user:tic_password@localhost:5434/tic_marketplace_dev?schema=public"
PORT=4011
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
NEXT_PUBLIC_API_URL="http://localhost:4011/api/v1"
```

## Start PostgreSQL with Docker

```bash
docker compose up -d postgres
```

Check container health:

```bash
docker compose ps
```

## Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

## Run the backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

The API runs on:

- http://localhost:4011
- Health check: http://localhost:4011/api/v1/health

## Run the frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The frontend runs on:

- http://localhost:3000

## Prisma commands

```bash
cd backend
npx prisma generate
npx prisma validate
npx prisma db push
npx prisma studio
```

## API health check

```bash
curl http://localhost:4011/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "tic-marketplace-api"
}
```

## Notes

- Phase 1 intentionally excludes authentication, onboarding, bidding, RFQ workflows, and provider management.
- The app follows a modular monolith pattern and keeps the infrastructure intentionally simple.
