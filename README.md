# Epsilon — PeopleCloud Spark

An AI-powered customer engagement platform with contextual bandit experimentation, campaign lifecycle management, and real-time audience intelligence.

## Architecture

```
epsilon/
├── frontend/          # Next.js 14 (App Router) + shadcn/ui + Tailwind v4
│   ├── src/
│   │   ├── app/       # Pages (landing, login, dashboard, campaigns, etc.)
│   │   ├── components/# Reusable UI components
│   │   └── lib/       # Actions, store, guardrails, gemini-client, etc.
│   └── prisma/        # Schema, migration scripts
└── backend/           # FastAPI — synthetic data generation, recommendations
    ├── main.py        # API server
    ├── feed_db.py     # Populates Supabase with seed data
    └── synthetic_data.py
```

### Key Features
- **Contextual Bandit Engine** — Thompson Sampling with batch processing (500/step)
- **Campaign Lifecycle** — `draft → review → approved → live → learning → completed → archived`
- **RBAC** — Growth Marketer, Data Scientist, Analyst, Approver, Owner roles
- **AI Guardrails** — Brand safety, compliance scoring, content moderation
- **Customer 360** — Enriched profiles with Gemini NLP explanations
- **Supabase PostgreSQL** — Production database with SQLite fallback

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase account (or use SQLite for local-only)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in your credentials
npx prisma db push      # sync schema to Supabase / SQLite
npm run dev             # http://localhost:3000
```

### Seed Data

```bash
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
python feed_db.py       # populates customers, campaigns, segments
```

### Database Options

1. **Supabase PostgreSQL** (default) — set `DATABASE_URL` + `DIRECT_URL` in `.env`
2. **SQLite** — comment out Supabase URLs, uncomment `DATABASE_URL="file:./dev.db"`

Migrate from SQLite to Supabase:
```bash
npx tsx prisma/migrate-to-supabase.ts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Supabase) / SQLite (Prisma) |
| Auth | NextAuth.js |
| State | Zustand |
| UI | Tailwind CSS v4 + shadcn/ui |
| AI | Google Gemini API |
| Backend | FastAPI (Python) |
