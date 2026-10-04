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
npx prisma migrate dev     # applies prisma/migrations (never edit the schema by hand)
npx prisma generate
npx prisma db seed         # RBAC catalogue, super admin and Phase 3 demo organizations
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
npx prisma migrate dev --name <change>   # create + apply a migration locally
npx prisma migrate deploy                # apply migrations in deployed environments (Render does this on start)
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

## Organizations (Phase 3)

Buyer and provider companies are modelled as organizations. Users join them through memberships and receive
organization-scoped roles, which are resolved by the same Phase 2 permission engine as global roles.

- Tables: `organizations`, `organization_users`, `organization_user_roles`, `organization_invitations`
  (`audit_logs` gained `organization_id` and `target_user_id`).
- Roles with `roles.organization_type` set (`BUYER`/`PROVIDER`) are organization roles and can only be granted inside
  a matching organization. Roles without it remain global roles (`user_roles`).
- Organization-scoped endpoints take the organization from the URL, or from the `X-Organization-Id` header for
  context endpoints. The backend always re-validates it against the caller's active membership; non-members get `404`.
- Only global roles granting `organizations.platform_access` (seeded for `SUPER_ADMIN`) can reach organizations
  without a membership. `ADMIN` does not.

Demo accounts (password `password123`, created by `npx prisma db seed`):

| User | Organizations |
| --- | --- |
| `bob+auth@example.com` | Super admin (platform access) |
| `john@example.com` | ABC Certification — owner, Provider Admin |
| `rahul@example.com` | ABC Certification — Provider User; Acme Industries — Buyer Admin |
| `priya@example.com` | XYZ Testing Labs — owner, Provider Admin |
| `ananya@example.com` | Acme Industries — owner, Buyer Admin |

Set `SEED_DEMO_ORGANIZATIONS=false` to skip the demo organizations.

Invitation emails go through `MailService`. With the default `MAIL_TRANSPORT=log` they are written to the backend log,
and outside production the invite response also returns the accept link so the flow can be completed locally.
Invitation tokens are stored only as SHA-256 hashes.

## Tests

```bash
cd backend
npm test            # unit tests
npm run test:e2e    # API tests against a local database
```

The e2e suite resets and seeds `tic_marketplace_test` on the Docker Postgres (`localhost:5434`). It refuses to run
against a non-local database or one whose name does not contain `test`; override with `TEST_DATABASE_URL`.

## Notes

- Phase 1 intentionally excludes authentication, onboarding, bidding, RFQ workflows, and provider management.
- Organization features require the Nest API. The Next.js fallback API under `/api/v1` (used when the frontend runs
  on a remote host without `NEXT_PUBLIC_API_URL`) returns an empty `organizations` list.
- The app follows a modular monolith pattern and keeps the infrastructure intentionally simple.
