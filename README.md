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

## Taxonomy and profiles (Phase 4)

Marketplace master data plus the profiles providers and individual professionals fill in from it. Search, matching,
RFQs and verification workflows are not part of this phase.

- Taxonomy tables: `service_categories` (hierarchical, typed), `services`, `standards`, `industries` (hierarchical),
  `locations` (country → state → city → postal code).
- Provider tables: `provider_profiles` (one per `PROVIDER` organization, keyed by `organization_id`) and the
  capability joins `provider_services`, `provider_standards`, `provider_industries`, `provider_locations`
  (with `coverage_type`).
- Professional tables: `professional_profiles` (one per user) and `professional_experience`.
- Taxonomy records that providers already use are deactivated instead of deleted. Inactive records (or records under
  an inactive parent) cannot be newly assigned, but existing assignments are kept and flagged.
- Active, verified and public are separate flags. Profiles start private with `verification_status = PENDING`; no
  endpoint lets a provider or professional change their verification status.
- A provider profile is publicly visible only when `public_profile` is true and its organization is an `ACTIVE`
  `PROVIDER` (`PUBLIC_PROVIDER_PROFILE_WHERE`). A professional profile needs `public_profile` and an `ACTIVE` user.
  The rule lives in the service layer; there is no public listing API yet.

APIs (all under `/api/v1`, JWT required):

| Area | Endpoints | Permission |
| --- | --- | --- |
| Taxonomy admin | `GET/POST /taxonomy/{categories,services,standards,industries,locations}`, `GET/PATCH/DELETE …/:id` | global `marketplace.*` |
| Provider profile | `GET/POST/PATCH /provider/profile`, `GET /provider/catalog` | org-scoped `providers.profile` |
| Provider capabilities | `GET/PUT/POST /provider/profile/{services,standards,industries,locations}`, `DELETE …/:id` | org-scoped `providers.*` |
| Professional profile | `GET/POST/PATCH /professional/profile`, `GET/POST /professional/experience`, `PATCH/DELETE …/:id` | global `professionals.*` |

Taxonomy list endpoints accept `search`, `active=true|false` and, where relevant, `parentId`, `categoryId`,
`categoryType`, `countryCode` and `format=tree` (categories and industries). Provider endpoints take the organization from
`X-Organization-Id` and reject `BUYER` organizations with `403`. `PUT` replaces a capability set.

Seeded grants: `SUPER_ADMIN` has full taxonomy and provider access; `ADMIN` can view, create and edit taxonomy but not
delete it, and has no provider access; `PROVIDER_ADMIN` edits the profile and manages capabilities; `PROVIDER_USER` is
view-only; `PROFESSIONAL` manages its own profile and experience. Provider roles never receive taxonomy permissions.

Additional demo data: XYZ Testing Labs has a public testing-lab profile; ABC Certification has none yet. New accounts
(password `password123`):

| User | Role |
| --- | --- |
| `arjun@example.com` | Professional, with a lead auditor profile and two experience entries |
| `meera@example.com` | Professional, no profile yet |

Frontend pages: `/admin/taxonomy`, `/provider/profile` (uses the organization selected in the header switcher; hidden
for buyer organizations) and `/professional/profile`. Header links appear only when the user has the matching
permission.

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
  on a remote host without `NEXT_PUBLIC_API_URL`) returns an empty `organizations` list. It does not implement the
  Phase 4 taxonomy, provider or professional endpoints either.
- The app follows a modular monolith pattern and keeps the infrastructure intentionally simple.
