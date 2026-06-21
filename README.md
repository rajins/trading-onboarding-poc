# UK Trading Account Onboarding POC

An AI-powered onboarding platform for UK retail trading accounts. Claude acts as an intelligent orchestrator calling 6 specialised MCP servers — all compliance decisions are deterministic, auditable, and FCA-aware.

**Stack:** Claude Sonnet 4.6 · MCP (Model Context Protocol) · Next.js 14 · Express · TypeScript · PostgreSQL · Docker Compose

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  FRONTEND  ·  Next.js 14  ·  Chat + Audit Panel │
└─────────────────────┬───────────────────────────┘
                      │  /api/chat  →  orchestrator:3001
┌─────────────────────▼───────────────────────────┐
│  CLAUDE ORCHESTRATOR  ·  Agentic Loop            │
│  Routes between MCP tools. Never decides.        │
│  Parallel tool dispatch via Map<toolName,Client> │
└──┬──────┬─────────┬─────────┬───────────────────┘
   │      │         │         │         │         │
┌──▼──┐ ┌─▼──┐ ┌───▼──┐ ┌───▼──┐ ┌────▼──────┐ ┌─▼────┐
│ PII │ │KYC │ │SUIT  │ │ELIG  │ │DISCLOSURE │ │AUDIT │
│ MCP │ │MCP │ │MCP   │ │MCP   │ │MCP        │ │MCP   │
└──┬──┘ └─┬──┘ └───┬──┘ └───┬──┘ └────┬──────┘ └──┬───┘
   │      └────────┴─────────┴─────────┘           │
   │              JSON RULES ENGINE                 │
   │           rules/uk/*.json                      │
   │                                                │
┌──▼────────────────────────────────────────────── ▼──┐
│  PostgreSQL  ·  3 domain databases                  │
│  onboarding_sessions  —  session messages (JSONB)   │
│  onboarding_audit     —  immutable audit events     │
│  onboarding_pii       —  AES-256-GCM encrypted PII  │
└─────────────────────────────────────────────────────┘
```

**Key principle:** Claude orchestrates but never makes compliance decisions. All PASS/FAIL outcomes come from deterministic JSON rules inside MCP servers.

### Design decisions

- **O(1) tool dispatch** — at startup, each server's tools are registered in a `Map<toolName, Client>`. Every `callTool` is a direct lookup with no fan-out.
- **Parallel tool execution** — when Claude returns multiple tool calls in a single response, they run concurrently via `Promise.all`.
- **Parallel startup** — `initDb()` and `initMcpServers()` run in parallel at boot via `Promise.all`.
- **Rules cached at module init** — KYC, suitability, and disclosure servers load and cache their JSON rules files on first access per product. No disk reads in the hot path.
- **Domain-specific databases** — sessions, audit events, and PII each have their own PostgreSQL database. MCP servers receive their own `DATABASE_URL` and are fully isolated.
- **Field-level encryption** — personal details are encrypted per field with AES-256-GCM (random 12-byte IV per field) before storage. The key is never logged or transmitted.
- **Shared MCP server factory** — all 6 servers use `mcp-servers/shared/create-server.ts` (`createMcpServer`), eliminating repeated stdio wiring boilerplate.
- **Typed session messages** — `Session.messages` is `Anthropic.MessageParam[]` throughout; no runtime casts in the agentic loop.
- **`appendAndSave`** — every mutation to session messages immediately persists to PostgreSQL, preventing in-memory/DB drift.

---

## MCP Servers

| Server | Tools | Data source |
|--------|-------|-------------|
| `personal-details-server` | `get_required_fields`, `save_personal_details`, `validate_personal_details`, `get_personal_details` | `onboarding_pii` PostgreSQL DB (AES-256-GCM encrypted JSONB) |
| `audit-server` | `write_audit_event`, `get_audit_trail`, `snapshot_decision` | `onboarding_audit` PostgreSQL DB (append-only) |
| `product-eligibility-server` | `get_eligible_products`, `get_required_journey_steps` | `rules/uk/eligibility.json` |
| `kyc-server` | `verify_identity`, `check_sanctions`, `assess_vulnerability` | `rules/uk/kyc.json` (cached) |
| `suitability-server` | `get_appropriateness_questions`, `run_appropriateness_test`, `check_retest_period` | `rules/uk/suitability/{product}.json` (cached per product) |
| `disclosure-server` | `get_required_disclosures`, `get_risk_warnings`, `get_consumer_duty_content` | `rules/uk/disclosures/{product}.json` (cached per product) |

All servers communicate over **stdio** and are spawned as subprocesses by the orchestrator at startup.

---

## Products Supported

| Product | Appropriateness Test | FCA Rule | Journey Steps |
|---------|---------------------|----------|---------------|
| ISA (Stocks & Shares) | No | — | Personal Details → KYC → Disclosure → Account |
| GIA (General Investment) | No | — | Personal Details → KYC → Disclosure → Account |
| CFD (Contracts for Difference) | Yes (4 questions, score ≥ 6/12) | COBS 10.2 | Personal Details → KYC → Suitability → Disclosure → Risk Warning → Account |
| SIPP (Personal Pension) | No (declaration only) | COBS 19 | Personal Details → KYC → Suitability → Disclosure → Pension Declaration → Account |
| Options & Derivatives | Yes (2 questions, score ≥ 4/6) | COBS 10.2 | Personal Details → KYC → Suitability → Disclosure → Risk Warning → Account |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Docker (for PostgreSQL)
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Clone and install

```bash
git clone <repo>
cd trading-onboarding-poc
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
ANTHROPIC_API_KEY=sk-ant-...

# Database URLs (matches docker-compose defaults)
SESSIONS_DATABASE_URL=postgresql://onboarding:onboarding@localhost:5432/onboarding_sessions
AUDIT_DATABASE_URL=postgresql://onboarding:onboarding@localhost:5432/onboarding_audit
PII_DATABASE_URL=postgresql://onboarding:onboarding@localhost:5432/onboarding_pii

# 32-byte hex key for AES-256-GCM PII encryption
# Generate with: openssl rand -hex 32
PERSONAL_DETAILS_ENCRYPTION_KEY=<64 hex chars>

ORCHESTRATOR_PORT=3001
FRONTEND_PORT=3000
```

### 3. Start PostgreSQL

```bash
docker compose up postgres -d
```

The `docker/init-db.sh` script runs automatically on first start and creates all 3 databases (`onboarding_sessions`, `onboarding_audit`, `onboarding_pii`). Tables are created by the application on first connection — no migrations required.

Wait for the healthcheck to pass:
```bash
docker compose ps   # postgres should show "(healthy)"
```

### 4. Run the orchestrator

```bash
cd apps/orchestrator
npx tsx src/index.ts
```

Wait for all 6 MCP servers to connect:
```
Orchestrator running on :3001
[MCP] Connected: personal-details (4 tools)
[MCP] Connected: audit (3 tools)
[MCP] Connected: eligibility (2 tools)
[MCP] Connected: kyc (3 tools)
[MCP] Connected: suitability (3 tools)
[MCP] Connected: disclosure (3 tools)
[MCP] All 6 servers connected.
```

### 5. Run the frontend

```bash
cd apps/frontend
npx next dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Docker (full stack)

To run everything in Docker:

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY and PERSONAL_DETAILS_ENCRYPTION_KEY in .env

docker compose up
```

Services start in dependency order (postgres healthcheck → orchestrator → frontend). Frontend available at [http://localhost:3000](http://localhost:3000).

---

## Demo Scenarios

### Scenario 1 — ISA (Happy Path)
> "I want to open an ISA"

Personal details collected → KYC → disclosure presented → account created. No appropriateness test required.

### Scenario 2 — CFD (Pass)
> "I want to open a CFD account" + answer questions correctly

Personal details (including income band + source of wealth) → KYC → 4-question appropriateness test (score ≥ 6) → FCA 74% loss warning → account created.

### Scenario 3 — CFD (Fail)
> "I want to open a CFD account" + answer questions with low scores

Personal details → KYC → appropriateness test FAIL (score < 6) → journey blocked → 30-day retest period enforced. Claude cannot override.

### Scenario 4 — PEP Customer
> Declare `is_pep: true` during personal details collection

Journey continues (POC does not block at onboarding layer), but `PEP_FLAGGED` is written to the audit trail and Claude informs the customer their account is flagged for enhanced due diligence.

---

## Project Structure

```
trading-onboarding-poc/
├── apps/
│   ├── frontend/               # Next.js 14 App Router — chat UI + audit panel
│   │   └── src/
│   │       ├── app/
│   │       │   ├── api/chat/   # Proxies to orchestrator :3001
│   │       │   └── api/audit/  # Proxies audit trail requests
│   │       └── components/
│   │           ├── ChatInterface.tsx
│   │           └── AuditPanel.tsx
│   └── orchestrator/           # Express + Claude agentic loop
│       └── src/
│           ├── index.ts        # Routes + agentic loop
│           ├── mcp-client.ts   # O(1) tool dispatch, spawns MCP subprocesses
│           ├── prompt.ts       # System prompt with compliance guardrails
│           ├── session.ts      # PostgreSQL session store (appendAndSave, rowToSession)
│           └── db.ts           # pg pool + schema init for onboarding_sessions
├── mcp-servers/
│   ├── shared/
│   │   └── create-server.ts    # Shared MCP server factory (createMcpServer)
│   ├── tsconfig.base.json      # Shared compiler options
│   ├── personal-details-server/ # PII collection + AES-256-GCM field encryption → onboarding_pii
│   ├── audit-server/           # Append-only audit events → onboarding_audit
│   ├── product-eligibility-server/
│   ├── kyc-server/
│   ├── suitability-server/
│   └── disclosure-server/
├── rules/
│   └── uk/
│       ├── eligibility.json    # Product eligibility + journey steps
│       ├── kyc.json            # KYC requirements and pass criteria
│       ├── personal-details.json  # Field definitions, enums, conditional triggers
│       ├── suitability/        # Appropriateness test questions + scoring per product
│       │   ├── cfd.json
│       │   ├── sipp.json
│       │   ├── options.json
│       │   ├── isa.json
│       │   └── gia.json
│       └── disclosures/        # FCA-mandated disclosure text
│           ├── cfd.json        # Includes mandatory 74% loss warning
│           ├── sipp.json
│           ├── options.json
│           ├── isa.json
│           └── gia.json
├── docker/
│   └── init-db.sh              # Creates onboarding_audit and onboarding_pii databases
├── .env.example
├── docker-compose.yml          # postgres:16-alpine + orchestrator + frontend
└── package.json                # npm workspaces root (apps/*, mcp-servers/*)
```

---

## Compliance Design

### What Claude does
- Decides which MCP tools to call and in what order
- Communicates with the customer in plain English
- Presents disclosure text fetched from `disclosure-server` verbatim

### What Claude never does
- Make a PASS/FAIL compliance decision
- Generate disclosure or risk warning text
- Reorder journey steps returned by `get_required_journey_steps`
- Override a FAIL from `run_appropriateness_test`

### Session persistence

Conversation history is stored in PostgreSQL (`onboarding_sessions` database, `sessions` table). Sessions survive orchestrator restarts — a customer can resume exactly where they left off.

```sql
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT,
  product_code TEXT,
  messages     JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Audit trail

Every tool call writes an immutable event to the `onboarding_audit` database. Events are queryable by `session_id` or `customer_id`.

```json
{
  "session_id": "session-1234",
  "event_type": "SUITABILITY_COMPLETED",
  "tool_name": "run_appropriateness_test",
  "decision": "FAIL",
  "input_snapshot": { "product_code": "CFD", "answers": { "q1": "none", "q2": "less_1" } },
  "output_snapshot": { "score": 3, "pass_threshold": 6 },
  "rule_version": "1.0.0",
  "created_at": "2026-06-21T07:00:00Z"
}
```

View the audit trail in the browser sidebar, or directly:
```bash
curl http://localhost:3001/audit/{session_id}
```

### PII encryption

Personal details are encrypted field-by-field using AES-256-GCM before being written to the `onboarding_pii` database. Each field uses a fresh random 12-byte IV. The encryption key is read from `PERSONAL_DETAILS_ENCRYPTION_KEY` and never logged.

---

## API Reference

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `POST` | `/chat` | `{ session_id, message }` | `{ reply, session_id }` |
| `GET` | `/audit/:session_id` | — | Array of audit events |
| `GET` | `/sessions` | — | `{ sessions: [{ id, product_code, created_at, message_count }] }` |

---

## Adding a New Region

1. Create `rules/{region}/eligibility.json`, `kyc.json`, `suitability/*.json`, `disclosures/*.json`
2. Set `RULES_PATH` env var to point to the new rules directory
3. Update `apps/orchestrator/src/prompt.ts` to reference the new region

No MCP server code changes required — all servers resolve rules from `RULES_PATH` at runtime.

---

## Roadmap

- [ ] Compliance dashboard — sessions, decision history, rule version tracking
- [ ] SIPP pension declaration step
- [ ] Options full journey
- [ ] Multi-region support (SG, IN)
- [ ] Re-test period enforcement UI
