# MedWatch AI

## Overview

Real-time patient safety intelligence dashboard for India's public health system. Monitors adverse drug reactions, hospital complaints, and outbreak signals from multiple sources using AI-powered NLP analysis.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (tables: `signals`, `alerts`)
- **AI/NLP**: Anthropic Claude (via Replit AI Integrations — no API key needed)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Map**: React-Leaflet (Karnataka district markers)
- **CSV Export**: PapaParse
- **Routing**: Wouter

## Architecture

- `artifacts/api-server` — Express backend with all API routes
- `artifacts/medwatch-ai` — React+Vite frontend (8 pages)
- `lib/api-spec` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react` — Generated React Query hooks
- `lib/api-zod` — Generated Zod schemas for backend validation
- `lib/db` — Drizzle ORM + PostgreSQL (signals + alerts tables)
- `lib/integrations-anthropic-ai` — Anthropic AI client via Replit proxy

## Pages

- `/` — Landing/Login (Health Official | Field Worker)
- `/dashboard` — Command Center with KPIs, live signal feed (auto-refresh 15s), trend panel, charts
- `/map` — Karnataka Geographic Cluster Map with Leaflet
- `/signals` — Signal Feed (searchable, filterable table, CSV export)
- `/signals/:id` — Signal Detail with AI analysis and entity highlighting
- `/submit` — Manual Report Submission with live Claude NLP analysis
- `/alerts` — Alert Center with cluster detection
- `/analytics` — Deep Analytics with 6 Recharts visualizations

## API Routes

- `GET /api/signals` — List with filters (risk_level, category, source_type, district, etc.)
- `GET /api/signals/stats/summary` — KPI stats
- `POST /api/signals/analyze` — AI-powered NLP analysis via Claude
- `POST /api/signals/simulate` — Inject simulated live signal
- `GET /api/signals/:id` — Single signal
- `PATCH /api/signals/:id/status` — Update status
- `GET /api/alerts` — List alerts
- `POST /api/alerts/check` — Run cluster detection (3+ critical in same district = alert)
- `PATCH /api/alerts/:id/status` — Acknowledge/escalate
- `GET /api/analytics/timeseries` — 24h signals by hour
- `GET /api/analytics/drugs` — Top flagged drugs
- `GET /api/analytics/hospitals` — Top flagged hospitals
- `GET /api/analytics/districts` — District-level breakdown

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Seed Data

50 signals auto-seeded on first startup: 10 real examples (Metformin ADR in Raichur, Victoria Hospital infection cluster, ORS contamination in Bellary, etc.) + 40 programmatically generated. Alerts auto-created for districts with 3+ critical signals.
