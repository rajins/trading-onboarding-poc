# UK Trading Account Onboarding POC

An AI-powered onboarding platform for UK retail trading accounts. Claude acts as an intelligent orchestrator calling 5 specialised MCP servers — all compliance decisions are deterministic, auditable, and FCA-aware.

**Stack:** Claude Sonnet 4.6 · MCP (Model Context Protocol) · Next.js 14 · Express · TypeScript · sql.js · Docker Compose

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
└──┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │
┌──▼──┐  ┌───▼──┐  ┌────▼─┐  ┌────▼──────┐  ┌────────┐
│ KYC │  │SUIT  │  │ELIG  │  │DISCLOSURE │  │ AUDIT  │
│ MCP │  │MCP   │  │MCP   │  │MCP        │  │ MCP ★  │
└──┬──┘  └───┬──┘  └────┬─┘  └────┬──────┘  └────┬───┘
   └──────────┴──────────┴─────────┴──────────────┘
                         │
              ┌──────────▼──────────┐
              │  JSON RULES ENGINE  │
              │  rules/uk/*.json    │
              └─────────────────────┘
```

**Key principle:** Claude orchestrates but never makes compliance decisions. All PASS/FAIL outcomes come from deterministic JSON rules inside MCP servers.

---

## MCP Servers

| Server | Port | Tools | Rules File |
|--------|------|-------|------------|
| `audit-server` | stdio | `write_audit_event`, `get_audit_trail`, `snapshot_decision` | append-only SQLite |
| `product-eligibility-server` | stdio | `get_eligible_products`, `get_required_journey_steps` | `rules/uk/eligibility.json` |
| `kyc-server` | stdio | `verify_identity`, `check_sanctions`, `assess_vulnerability` | `rules/uk/kyc.json` |
| `suitability-server` | stdio | `get_appropriateness_questions`, `run_appropriateness_test`, `check_retest_period` | `rules/uk/suitability/{product}.json` |
| `disclosure-server` | stdio | `get_required_disclosures`, `get_risk_warnings`, `get_consumer_duty_content` | `rules/uk/disclosures/{product}.json` |

---

## Products Supported

| Product | Appropriateness Test | FCA Rule | Journey Steps |
|---------|---------------------|----------|---------------|
| ISA (Stocks & Shares) | No | — | KYC → Disclosure → Account |
| GIA (General Investment) | No | — | KYC → Disclosure → Account |
| CFD (Contracts for Difference) | Yes (4 questions, score ≥ 6/12) | COBS 10.2 | KYC → Suitability → Disclosure → Risk Warning → Account |
| SIPP (Personal Pension) | No (declaration only) | COBS 19 | KYC → Suitability → Disclosure → Pension Declaration → Account |
| Options & Derivatives | Yes (2 questions, score ≥ 4/6) | COBS 10.2 | KYC → Suitability → Disclosure → Risk Warning → Account |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- An Anthropic API key with credits ([console.anthropic.com](https://console.anthropic.com))

### 1. Clone and install

```bash
git clone <repo>
cd trading-onboarding-poc
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY
```

```env
ANTHROPIC_API_KEY=sk-ant-...
ORCHESTRATOR_PORT=3001
FRONTEND_PORT=3000
AUDIT_DB_PATH=./data/audit.db
```

### 3. Run the orchestrator

```bash
cd apps/orchestrator
npx tsx src/index.ts
```

Wait for:
```
[MCP] All servers connected. Tools: get_eligible_products, ...
Orchestrator running on :3001
```

### 4. Run the frontend

```bash
# In a new terminal
cd apps/frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Scenarios

### Scenario 1 — ISA (Happy Path, 3 steps)
> "I want to open an ISA"

KYC → disclosure presented → account created. No appropriateness test.

### Scenario 2 — CFD PASS (Full Journey, 5 steps)
> "I want to open a CFD account" + answer questions with high scores

KYC → 4-question appropriateness test (score ≥ 6) → FCA 74% loss warning → account created.

### Scenario 3 — CFD FAIL (Blocked)
> "I want to open a CFD account" + answer questions with low scores

KYC → appropriateness test FAIL (score < 6) → journey stopped → 30-day retest period enforced. Claude cannot override.

---

## Project Structure

```
trading-onboarding-poc/
├── apps/
│   ├── frontend/               # Next.js 14 — chat UI + audit panel
│   └── orchestrator/           # Express + Claude agentic loop
├── mcp-servers/
│   ├── audit-server/           # Append-only SQLite audit log
│   ├── product-eligibility-server/
│   ├── kyc-server/
│   ├── suitability-server/
│   └── disclosure-server/
├── rules/
│   └── uk/
│       ├── eligibility.json    # Product eligibility per customer type/age
│       ├── kyc.json            # KYC requirements and mock pass criteria
│       ├── suitability/        # Appropriateness test questions + scoring
│       │   ├── cfd.json
│       │   ├── sipp.json
│       │   ├── options.json
│       │   ├── isa.json
│       │   └── gia.json
│       └── disclosures/        # FCA-mandated disclosure text (pre-approved)
│           ├── cfd.json        # Includes mandatory 74% loss warning
│           ├── sipp.json
│           ├── options.json
│           ├── isa.json
│           └── gia.json
├── .env.example
├── docker-compose.yml
└── package.json
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

### Audit trail
Every tool call writes an immutable event to the audit SQLite database:

```json
{
  "session_id": "session-1234",
  "event_type": "SUITABILITY_COMPLETED",
  "tool_name": "run_appropriateness_test",
  "decision": "FAIL",
  "input_snapshot": { "product_code": "CFD", "answers": { "q1": "none", ... } },
  "output_snapshot": { "score": 3, "pass_threshold": 6 },
  "rule_version": "1.0.0",
  "created_at": "2026-06-20T07:00:00Z"
}
```

View the audit trail live in the browser sidebar, or via API:
```bash
curl http://localhost:3001/audit/{session_id}
```

---

## Adding a New Region

1. Create `rules/{region}/eligibility.json`, `kyc.json`, `suitability/*.json`, `disclosures/*.json`
2. Update the orchestrator system prompt in `apps/orchestrator/src/prompt.ts` to reference the new region
3. No MCP server code changes required

---

## Docker

```bash
# Copy and populate .env first
docker-compose up
```

Services start in dependency order. Frontend available at [http://localhost:3000](http://localhost:3000).

---

## Roadmap (Weeks 5–8)

- [ ] Compliance dashboard — all sessions, decision history, rule version tracking
- [ ] SIPP pension declaration step
- [ ] Options full journey
- [ ] Multi-region support (SG, IN)
- [ ] Re-test period enforcement UI
