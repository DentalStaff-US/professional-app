# dtss-candidate-app (Candidate Portal)

The candidate (dental professional) portal for Dental Staff US. This is the only app where `CANDIDATE`-role users may be logged in — the admin app forcibly redirects them here.

> This app is part of a three-repo workspace. See [`../CLAUDE.md`](../CLAUDE.md) for the full architecture overview, cross-cutting gotchas, and how this app relates to [`dental-staff-app`](../dental-staff-app/) and [`dtss-landing`](../dtss-landing/).

## Stack

- **Framework:** SvelteKit 2 + TypeScript, Node adapter
- **Database:** Same Postgres on Railway as the admin app (shared `DATABASE_URL`), accessed via Drizzle with a candidate-scoped schema
- **Auth:** Lucia 3 with the Drizzle Postgres adapter
- **UI:** Tailwind + shadcn-svelte primitives
- **Cache:** Redis via `ioredis` ([src/lib/server/cache/](src/lib/server/cache/))
- **Integration:** JWT-authenticated calls to `dental-staff-app`'s `/api/external/*` endpoints (shared `JWT_SECRET`)

## How this app fits in

Many candidate reads/writes are **not** made via local Drizzle queries — they go over HTTP to the admin app's `/api/external/*` endpoints. This keeps a single source of truth for business logic in [`dental-staff-app`](../dental-staff-app/). The typical pattern for a new candidate feature:

1. Add or extend an endpoint under `dental-staff-app/src/routes/api/external/<thing>/+server.ts`.
2. Call it from `dtss-candidate-app/src/routes/(protected)/<feature>/+page.server.ts`.

The local Drizzle schema at [src/lib/server/database/drizzle-schemas.ts](src/lib/server/database/drizzle-schemas.ts) is a **subset** of the canonical schema, scoped to candidate concerns. When a shared table changes, update both apps' schemas and run migrations from `dental-staff-app` first.

## Getting started

```bash
cp sample.env .env        # then fill in secrets — DATABASE_URL (shared with admin app), JWT_SECRET, BASE_URL, Redis URL, etc.
npm install
npm run dev               # http://localhost:5173
```

Migrations are normally applied from the admin app — only run `npm run migrate` here if you've made candidate-only schema changes and coordinated with the team.

## Scripts

```bash
npm run dev          # vite dev (default port 5173)
npm run build        # vite build (Node adapter output)
npm run preview      # preview built bundle
npm run check        # svelte-kit sync && svelte-check
npm run lint         # prettier --check . && eslint .
npm run format       # prettier --write .
npm run generate     # drizzle-kit generate — write a new migration from schema diff
npm run migrate      # drizzle-kit push — apply schema directly (use sparingly; prefer admin app)
npm run studio       # drizzle-kit studio — DB browser UI
```

There is no test runner configured. "Run tests" here means `npm run check` + `npm run lint`.

## Project layout

```
src/
├── hooks.server.ts                Session validation + (protected)/(admin) gates — simpler than the admin app
├── app.d.ts                       Lucia type extensions
├── routes/
│   ├── (public)/                  Unauthenticated: landing, auth, _about-us, _contact-us, _privacy-policy, _terms-and-conditions
│   ├── (legal)/                   Legal pages
│   ├── (protected)/               Candidate-only authenticated area
│   │   ├── dashboard/             Overview
│   │   ├── my-shifts/             Assigned shifts
│   │   ├── calendar/              Availability + schedule
│   │   ├── timesheets/            Submit timesheets, log expenses
│   │   ├── inbox/                 Messages from clients/admin
│   │   ├── permanent/             Permanent placement opportunities
│   │   ├── company/               Company / employer info
│   │   ├── onboarding/            Candidate onboarding flow
│   │   └── settings/              Profile, password, preferences
│   └── api/                       Local API endpoints
└── lib/
    └── server/
        ├── database/
        │   ├── drizzle.ts
        │   └── drizzle-schemas.ts Candidate-scoped subset of the shared schema
        ├── cache/                 Redis (ioredis) helpers
        ├── lucia.ts               Lucia init
        └── …                      Local services, API client helpers for /api/external
```

### Request lifecycle

[hooks.server.ts](src/hooks.server.ts) is intentionally lean compared to the admin app:

1. Validates the Lucia session cookie.
2. Enforces `(protected)` and `(admin)` route-group gates.

No role-based redirect, no cron jobs — both live in `dental-staff-app`.

## Environment

Required vars include `DATABASE_URL` (shared with admin), `JWT_SECRET` (shared with admin), `BASE_URL`, and the Redis connection string. See [sample.env](sample.env) for the full list.
