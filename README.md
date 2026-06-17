# PeopleCloud Spark

### Real-Time Contextual Personalization & Decisioning Engine

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-181717?style=for-the-badge\&logo=nextdotjs\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge\&logo=fastapi\&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge\&logo=supabase\&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge\&logo=prisma\&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini%20AI-8E75B2?style=for-the-badge\&logo=google\&logoColor=white)

</div>

---

## Overview

**PeopleCloud Spark** is an AI-powered customer engagement and decisioning platform designed to deliver real-time, context-aware personalization across customer journeys.

The platform combines **campaign lifecycle management**, **audience intelligence**, **AI-assisted content evaluation**, **contextual bandit experimentation**, and **customer 360 analytics** into a single decisioning workspace.

It is built as a full-stack product prototype with a **Next.js frontend**, **FastAPI backend**, **Supabase/PostgreSQL database**, and **Gemini-powered AI intelligence layer**.

---

## Problem Statement

Modern marketing and growth teams often struggle with:

* Fragmented customer data across tools and channels
* Static campaign rules that do not adapt to user behavior
* Slow experimentation cycles
* Weak personalization governance
* Lack of visibility into why a recommendation or offer was selected
* Manual campaign approvals and compliance checks

**PeopleCloud Spark** addresses this by creating a unified personalization engine where campaigns, customer context, AI guardrails, and experimentation loops work together.

---

## Key Features

### 1. Real-Time Personalization Engine

* Context-aware customer decisioning
* Personalized campaign recommendations
* Adaptive audience treatment selection
* Batch simulation for experimentation and learning

### 2. Contextual Bandit Experimentation

* Thompson Sampling based decision logic
* Reward-driven learning loop
* Batch processing support for simulation events
* Campaign performance improvement through feedback signals

### 3. Campaign Lifecycle Management

Supports a structured campaign workflow:

```txt
Draft → Review → Approved → Live → Learning → Completed → Archived
```

This makes the platform suitable for marketing, product growth, and experimentation teams that need controlled campaign execution.

### 4. Role-Based Access Control

Designed around multiple user personas:

* Growth Marketer
* Data Scientist
* Business Analyst
* Campaign Approver
* Workspace Owner

### 5. AI Guardrails

* Brand safety validation
* Compliance scoring
* Banned phrase detection
* Approved claims checking
* AI-assisted content quality evaluation

### 6. Customer 360 Intelligence

* Enriched customer profiles
* Segment-level insights
* Behavioral context
* AI-generated explanations using Gemini
* Customer-level personalization reasoning

### 7. Analytics Dashboard

* Campaign performance tracking
* Audience and segment monitoring
* Experiment learning status
* Recommendation and decisioning metrics
* Export-ready analytics workflows

---

## System Architecture

```txt
PeopleCloud Spark
│
├── frontend/
│   ├── Next.js App Router
│   ├── TypeScript
│   ├── Tailwind CSS
│   ├── shadcn/ui
│   ├── Zustand state management
│   ├── NextAuth authentication
│   ├── Prisma ORM
│   └── Recharts dashboards
│
├── backend/
│   ├── FastAPI server
│   ├── Synthetic data generation
│   ├── Recommendation APIs
│   ├── Supabase integration
│   ├── Gemini AI integration
│   ├── FAISS vector search
│   └── scikit-learn based analytics
│
└── database/
    ├── Supabase PostgreSQL
    ├── Prisma schema
    └── SQLite fallback for local development
```

---

## Tech Stack

| Layer            | Technology                                           |
| ---------------- | ---------------------------------------------------- |
| Frontend         | Next.js, React, TypeScript                           |
| UI               | Tailwind CSS, shadcn/ui, Lucide Icons, Framer Motion |
| State Management | Zustand                                              |
| Authentication   | NextAuth.js                                          |
| Database         | Supabase PostgreSQL, SQLite fallback                 |
| ORM              | Prisma                                               |
| Backend          | FastAPI, Uvicorn                                     |
| AI Layer         | Google Gemini API                                    |
| ML / Search      | scikit-learn, FAISS                                  |
| Data Processing  | pandas, numpy                                        |
| Visualization    | Recharts                                             |
| Validation       | Zod                                                  |
| Data Export      | CSV / XLSX support                                   |

---

## Project Structure

```txt
PeopleCloud-Spark-Real-Time-Contextual-Personalization-Decisioning-Engine/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── prisma/
│   ├── scripts/
│   ├── package.json
│   └── README files / config files
│
├── backend/
│   ├── main.py
│   ├── feed_db.py
│   ├── synthetic_data.py
│   └── requirements.txt
│
├── .env.example
├── Product Description and Architecture (PRD).docx
└── README.md
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

```txt
Node.js 18+
Python 3.10+
Git
Supabase account
Google Gemini API key
```

---

## Environment Variables

Create a `.env` file using `.env.example` as reference.

### Frontend Environment

```env
DATABASE_URL="your_database_url"
DIRECT_URL="your_direct_database_url"

NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"

GEMINI_API_KEY="your_gemini_api_key"
```

### Backend Environment

```env
SUPABASE_URL="your_supabase_project_url"
SUPABASE_KEY="your_supabase_anon_or_service_key"

GEMINI_API_KEY="your_gemini_api_key"
DATABASE_URL="your_database_url"
```

For local-only development, SQLite can be used as a fallback database.

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

```txt
http://localhost:3000
```

---

## Database Setup

Sync the Prisma schema:

```bash
cd frontend
npx prisma db push
```

Optional seed commands:

```bash
npm run db:seed
npm run db:seed:large
npm run db:verify
```

To reset or clear demo data:

```bash
npm run db:reset
npm run db:clear
```

---

## Backend Setup

```bash
cd backend
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### macOS / Linux

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the FastAPI server:

```bash
uvicorn main:app --reload
```

The backend will run at:

```txt
http://localhost:8000
```

---

## Seed Demo Data

From the backend folder:

```bash
python feed_db.py
```

This populates the database with demo customers, campaigns, segments, and related platform data.

---

## Core Modules

### Campaign Workspace

A campaign control center for creating, reviewing, approving, launching, and monitoring personalization campaigns.

### Audience Intelligence

Customer segmentation and profile intelligence layer for understanding user behavior and campaign eligibility.

### Decisioning Engine

Recommendation logic that selects the best treatment, offer, or message based on available customer context.

### Experimentation Layer

Contextual bandit workflow that learns from simulated or real interaction outcomes.

### AI Governance

Guardrail system that checks campaign language, banned phrases, approved claims, and compliance signals.

### Analytics Layer

Dashboard-driven performance monitoring for campaign outcomes, learning progress, and engagement metrics.

---

## Example Use Cases

* Personalized marketing campaign selection
* AI-assisted campaign copy validation
* Customer 360 intelligence dashboard
* Real-time growth experimentation
* Campaign approval and compliance workflow
* Segment-level offer recommendation
* Synthetic customer event simulation
* Product growth analytics workspace

---

## Why This Project Matters

PeopleCloud Spark demonstrates how modern customer engagement platforms can move beyond static segmentation and rule-based campaigns.

The project brings together:

* **Product thinking** through campaign lifecycle and user roles
* **AI integration** through Gemini-powered explanations and guardrails
* **Data science** through contextual bandit based learning
* **Full-stack engineering** through Next.js, FastAPI, Prisma, and Supabase
* **Analytics thinking** through dashboards, metrics, and decision traceability

---

## Current Status

This is a working product prototype built for experimentation, demonstration, and architecture validation.

Implemented areas include:

* Full-stack app structure
* Campaign lifecycle model
* Supabase / SQLite database support
* FastAPI backend utilities
* Synthetic data generation
* AI-assisted customer and campaign intelligence
* Dashboard and analytics-oriented frontend modules

---

## Future Enhancements

* Live event streaming pipeline
* Production-grade audit logging
* Advanced reward modelling
* Multi-channel campaign delivery
* Real-time feature store integration
* More robust RBAC enforcement
* A/B testing and uplift modelling dashboard
* Model monitoring and drift detection
* Deployment with Docker and cloud infrastructure

---

## Screenshots

Add screenshots here after deployment or local testing.

```md
![Dashboard Preview](./assets/dashboard.png)
![Campaign Workspace](./assets/campaign-workspace.png)
![Customer 360](./assets/customer-360.png)
```

---

## Author

**Sparsh Taparia**

* GitHub: [@Sparshtaparia](https://github.com/Sparshtaparia)
* Email: [sparshtaparia2005@gmail.com](mailto:sparshtaparia2005@gmail.com)

---

## License

This project is currently maintained as an academic / portfolio prototype.
Add a license file if you plan to make it open source for public reuse.

---

## Acknowledgement

Built as a real-time contextual personalization and decisioning engine inspired by modern customer engagement, growth experimentation, and AI-powered marketing automation platforms.
