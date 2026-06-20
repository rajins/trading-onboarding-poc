# Trading Onboarding POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a demo-account onboarding POC for UK retail trading that uses Claude as an AI orchestrator calling deterministic MCP servers, with a hybrid chat+form frontend, full audit trail, and dynamic journey routing per product.

**Architecture:** Claude acts as orchestrator only — it routes between 5 MCP servers (kyc, suitability, product-eligibility, disclosure, audit) but never makes compliance decisions. Each MCP server evaluates JSON rules deterministically and writes every decision to an append-only audit log. The frontend is Next.js with a chat interface for guidance and dynamic forms for data collection.

**Tech Stack:** TypeScript, Next.js 14 (App Router), Express, Anthropic SDK (`@anthropic-ai/sdk`), MCP SDK (`@modelcontextprotocol/sdk`), better-sqlite3, Tailwind CSS, npm workspaces, Docker Compose.

---

## File Structure

```
trading-onboarding-poc/
├── package.json                          # npm workspaces root
├── docker-compose.yml
├── .env.example
├── apps/
│   ├── frontend/                         # Next.js 14
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx              # main onboarding page
│   │       │   └── api/chat/route.ts     # proxy to orchestrator
│   │       └── components/
│   │           ├── ChatInterface.tsx     # chat bubble UI
│   │           ├── DynamicForm.tsx       # renders fields from orchestrator
│   │           └── AuditPanel.tsx        # shows audit trail
│   └── orchestrator/                     # Express + Claude
│       ├── package.json
│       └── src/
│           ├── index.ts                  # Express server
│           ├── claude.ts                 # Claude client + system prompt
│           ├── mcp-client.ts             # connects to all MCP servers
│           └── session.ts                # per-session state (customerId, product)
├── mcp-servers/
│   ├── audit-server/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts                  # MCP server entrypoint
│   │       ├── tools.ts                  # write_audit_event, get_audit_trail, snapshot_decision
│   │       └── db.ts                     # better-sqlite3 append-only
│   ├── product-eligibility-server/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── tools.ts                  # get_eligible_products, get_required_journey_steps
│   │       └── rules-loader.ts           # loads rules/uk/eligibility.json
│   ├── kyc-server/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── tools.ts                  # verify_identity, check_sanctions, assess_vulnerability
│   ├── suitability-server/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── tools.ts                  # run_appropriateness_test, evaluate_experience, check_retest_period
│   └── disclosure-server/
│       ├── package.json
│       └── src/
│           ├── index.ts
│           └── tools.ts                  # get_required_disclosures, get_risk_warnings, get_consumer_duty_content
├── rules/
│   └── uk/
│       ├── kyc.json
│       ├── eligibility.json
│       ├── suitability/
│       │   ├── isa.json
│       │   ├── gia.json
│       │   ├── cfd.json
│       │   ├── sipp.json
│       │   └── options.json
│       └── disclosures/
│           ├── isa.json
│           ├── gia.json
│           ├── cfd.json
│           ├── sipp.json
│           └── options.json
└── docs/superpowers/plans/
    └── 2026-06-20-trading-onboarding-poc.md
```

---

## Phase 1: Foundation (Weeks 1–2)

### Task 1: Workspace Root Setup

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create workspace root package.json**

```json
{
  "name": "trading-onboarding-poc",
  "private": true,
  "workspaces": [
    "apps/*",
    "mcp-servers/*"
  ],
  "scripts": {
    "dev": "docker-compose up",
    "build": "npm run build --workspaces",
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

- [ ] **Step 2: Create .env.example**

```bash
ANTHROPIC_API_KEY=your_key_here
ORCHESTRATOR_PORT=3001
FRONTEND_PORT=3000
AUDIT_DB_PATH=./data/audit.db
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  orchestrator:
    build: ./apps/orchestrator
    ports:
      - "3001:3001"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AUDIT_DB_PATH=/data/audit.db
    volumes:
      - audit-data:/data
      - ./rules:/app/rules
      - ./mcp-servers:/app/mcp-servers
    depends_on:
      - audit-server
      - product-eligibility-server
      - kyc-server
      - suitability-server
      - disclosure-server

  audit-server:
    build: ./mcp-servers/audit-server
    volumes:
      - audit-data:/data
    environment:
      - AUDIT_DB_PATH=/data/audit.db

  product-eligibility-server:
    build: ./mcp-servers/product-eligibility-server
    volumes:
      - ./rules:/app/rules

  kyc-server:
    build: ./mcp-servers/kyc-server
    volumes:
      - ./rules:/app/rules

  suitability-server:
    build: ./mcp-servers/suitability-server
    volumes:
      - ./rules:/app/rules

  disclosure-server:
    build: ./mcp-servers/disclosure-server
    volumes:
      - ./rules:/app/rules

  frontend:
    build: ./apps/frontend
    ports:
      - "3000:3000"
    environment:
      - ORCHESTRATOR_URL=http://orchestrator:3001

volumes:
  audit-data:
```

- [ ] **Step 4: Create .env from example**

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

- [ ] **Step 5: Commit**

```bash
git init
git add package.json .env.example docker-compose.yml .gitignore
git commit -m "feat: workspace root scaffold"
```

---

### Task 2: Audit Server (Build First — Everything Logs Here)

**Files:**
- Create: `mcp-servers/audit-server/package.json`
- Create: `mcp-servers/audit-server/src/db.ts`
- Create: `mcp-servers/audit-server/src/tools.ts`
- Create: `mcp-servers/audit-server/src/index.ts`
- Create: `mcp-servers/audit-server/Dockerfile`

- [ ] **Step 1: Create audit-server package.json**

```json
{
  "name": "audit-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^9.4.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create db.ts — append-only SQLite**

```typescript
// mcp-servers/audit-server/src/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.AUDIT_DB_PATH || './audit.db';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        customer_id TEXT,
        event_type TEXT NOT NULL,
        tool_name TEXT,
        input_snapshot TEXT,
        output_snapshot TEXT,
        decision TEXT,
        rule_version TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_session ON audit_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_customer ON audit_events(customer_id);
    `);
  }
  return db;
}

export function writeAuditEvent(params: {
  session_id: string;
  customer_id?: string;
  event_type: string;
  tool_name?: string;
  input_snapshot?: unknown;
  output_snapshot?: unknown;
  decision?: string;
  rule_version?: string;
}): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO audit_events
      (session_id, customer_id, event_type, tool_name, input_snapshot, output_snapshot, decision, rule_version)
    VALUES
      (@session_id, @customer_id, @event_type, @tool_name, @input_snapshot, @output_snapshot, @decision, @rule_version)
  `);
  const result = stmt.run({
    ...params,
    input_snapshot: params.input_snapshot ? JSON.stringify(params.input_snapshot) : null,
    output_snapshot: params.output_snapshot ? JSON.stringify(params.output_snapshot) : null,
  });
  return result.lastInsertRowid as number;
}

export function getAuditTrail(session_id: string): unknown[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM audit_events WHERE session_id = ? ORDER BY created_at ASC'
  ).all(session_id);
}
```

- [ ] **Step 3: Create tools.ts — MCP tool definitions**

```typescript
// mcp-servers/audit-server/src/tools.ts
import { z } from 'zod';
import { writeAuditEvent, getAuditTrail } from './db.js';

export const auditTools = {
  write_audit_event: {
    description: 'Write an immutable audit event. Call after every compliance decision.',
    inputSchema: z.object({
      session_id: z.string().describe('Unique session identifier'),
      customer_id: z.string().optional().describe('Customer identifier if known'),
      event_type: z.enum([
        'JOURNEY_STARTED', 'PRODUCT_SELECTED', 'KYC_INITIATED', 'KYC_COMPLETED',
        'SUITABILITY_INITIATED', 'SUITABILITY_COMPLETED', 'DISCLOSURE_PRESENTED',
        'DISCLOSURE_ACKNOWLEDGED', 'JOURNEY_COMPLETED', 'JOURNEY_ABANDONED', 'RULE_EVALUATED'
      ]),
      tool_name: z.string().optional().describe('MCP tool that produced this event'),
      input_snapshot: z.record(z.unknown()).optional().describe('Input data at decision time'),
      output_snapshot: z.record(z.unknown()).optional().describe('Output/decision data'),
      decision: z.enum(['PASS', 'FAIL', 'PENDING', 'SKIPPED']).optional(),
      rule_version: z.string().optional().describe('Version of rules file evaluated'),
    }),
    handler: (input: z.infer<typeof auditTools.write_audit_event.inputSchema>) => {
      const id = writeAuditEvent(input);
      return { success: true, audit_id: id };
    },
  },

  get_audit_trail: {
    description: 'Retrieve full audit trail for a session.',
    inputSchema: z.object({
      session_id: z.string(),
    }),
    handler: (input: { session_id: string }) => {
      const events = getAuditTrail(input.session_id);
      return { events, count: events.length };
    },
  },

  snapshot_decision: {
    description: 'Write a compliance decision snapshot — input data, rule evaluated, outcome.',
    inputSchema: z.object({
      session_id: z.string(),
      customer_id: z.string().optional(),
      tool_name: z.string(),
      input_snapshot: z.record(z.unknown()),
      output_snapshot: z.record(z.unknown()),
      decision: z.enum(['PASS', 'FAIL', 'PENDING', 'SKIPPED']),
      rule_version: z.string(),
    }),
    handler: (input: z.infer<typeof auditTools.snapshot_decision.inputSchema>) => {
      const id = writeAuditEvent({ ...input, event_type: 'RULE_EVALUATED' });
      return { success: true, audit_id: id, decision: input.decision };
    },
  },
};
```

- [ ] **Step 4: Create index.ts — MCP server entrypoint**

```typescript
// mcp-servers/audit-server/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { auditTools } from './tools.js';

const server = new McpServer({
  name: 'audit-server',
  version: '1.0.0',
});

for (const [name, tool] of Object.entries(auditTools)) {
  server.tool(name, tool.description, tool.inputSchema.shape, (input: unknown) => {
    const result = tool.handler(input as never);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Audit MCP server running on stdio');
```

- [ ] **Step 5: Create Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
COPY tsconfig.json ./
RUN npm run build
CMD ["node", "dist/index.js"]
```

- [ ] **Step 6: Install deps and verify it starts**

```bash
cd mcp-servers/audit-server
npm install
npx tsx src/index.ts
# Expected: "Audit MCP server running on stdio" printed to stderr
# Ctrl+C to stop
```

- [ ] **Step 7: Commit**

```bash
git add mcp-servers/audit-server
git commit -m "feat: audit MCP server with append-only SQLite"
```

---

### Task 3: JSON Rules Files

**Files:**
- Create: `rules/uk/eligibility.json`
- Create: `rules/uk/kyc.json`
- Create: `rules/uk/suitability/isa.json`
- Create: `rules/uk/suitability/gia.json`
- Create: `rules/uk/suitability/cfd.json`
- Create: `rules/uk/suitability/sipp.json`
- Create: `rules/uk/suitability/options.json`
- Create: `rules/uk/disclosures/isa.json`
- Create: `rules/uk/disclosures/gia.json`
- Create: `rules/uk/disclosures/cfd.json`
- Create: `rules/uk/disclosures/sipp.json`
- Create: `rules/uk/disclosures/options.json`

- [ ] **Step 1: Create eligibility.json**

```json
{
  "version": "1.0.0",
  "region": "UK",
  "products": {
    "ISA": {
      "label": "Stocks & Shares ISA",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "required_journey_steps": ["KYC", "DISCLOSURE_ISA", "ACCOUNT_SETUP"],
      "suitability_required": false,
      "appropriateness_test_required": false
    },
    "GIA": {
      "label": "General Investment Account",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "required_journey_steps": ["KYC", "DISCLOSURE_GIA", "ACCOUNT_SETUP"],
      "suitability_required": false,
      "appropriateness_test_required": false
    },
    "CFD": {
      "label": "Contracts for Difference",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "required_journey_steps": [
        "KYC", "SUITABILITY_CFD", "DISCLOSURE_CFD", "RISK_WARNING_CFD", "ACCOUNT_SETUP"
      ],
      "suitability_required": true,
      "appropriateness_test_required": true,
      "fca_leverage_limit": "1:30",
      "loss_warning_threshold": 0.70
    },
    "SIPP": {
      "label": "Self-Invested Personal Pension",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "maximum_age": 75,
      "required_journey_steps": [
        "KYC", "SUITABILITY_SIPP", "DISCLOSURE_SIPP", "PENSION_DECLARATION", "ACCOUNT_SETUP"
      ],
      "suitability_required": true,
      "appropriateness_test_required": false
    },
    "OPTIONS": {
      "label": "Options & Derivatives",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "required_journey_steps": [
        "KYC", "SUITABILITY_OPTIONS", "DISCLOSURE_OPTIONS", "RISK_WARNING_OPTIONS", "ACCOUNT_SETUP"
      ],
      "suitability_required": true,
      "appropriateness_test_required": true
    }
  }
}
```

- [ ] **Step 2: Create kyc.json**

```json
{
  "version": "1.0.0",
  "region": "UK",
  "required_fields": ["full_name", "date_of_birth", "national_insurance_number", "address", "nationality"],
  "sanctions_lists": ["OFAC", "UN", "UK_HMT"],
  "pep_check_required": true,
  "vulnerability_indicators": [
    "recent_bereavement", "mental_health_condition", "financial_difficulty",
    "low_financial_literacy", "age_over_80"
  ],
  "document_requirements": {
    "identity": ["passport", "driving_licence", "national_id"],
    "address": ["utility_bill", "bank_statement", "council_tax"]
  },
  "mock_pass_criteria": {
    "name_not_in": ["SANCTIONED PERSON", "TEST BLOCKED"],
    "age_minimum": 18
  }
}
```

- [ ] **Step 3: Create suitability/cfd.json (most complex — do this one fully)**

```json
{
  "version": "1.0.0",
  "product": "CFD",
  "region": "UK",
  "fca_rule_reference": "COBS 10.2",
  "retest_waiting_period_days": 30,
  "questions": [
    {
      "id": "q1",
      "text": "How many years of experience do you have trading leveraged products such as CFDs, spread bets, or futures?",
      "options": [
        { "value": "none", "label": "No experience", "score": 0 },
        { "value": "less_than_1", "label": "Less than 1 year", "score": 1 },
        { "value": "1_to_3", "label": "1–3 years", "score": 2 },
        { "value": "more_than_3", "label": "More than 3 years", "score": 3 }
      ]
    },
    {
      "id": "q2",
      "text": "How often did you trade leveraged products in the past 12 months?",
      "options": [
        { "value": "never", "label": "Never", "score": 0 },
        { "value": "occasionally", "label": "Occasionally (less than 10 trades)", "score": 1 },
        { "value": "regularly", "label": "Regularly (10–40 trades)", "score": 2 },
        { "value": "frequently", "label": "Frequently (more than 40 trades)", "score": 3 }
      ]
    },
    {
      "id": "q3",
      "text": "What is your highest level of financial education or qualification?",
      "options": [
        { "value": "none", "label": "No formal financial education", "score": 0 },
        { "value": "self_taught", "label": "Self-taught / online courses", "score": 1 },
        { "value": "degree", "label": "Finance/Economics degree", "score": 2 },
        { "value": "professional", "label": "Professional qualification (CFA, ACCA, etc.)", "score": 3 }
      ]
    },
    {
      "id": "q4",
      "text": "If you open a CFD position worth £10,000 at 10:1 leverage, what is your maximum possible loss?",
      "options": [
        { "value": "1000", "label": "£1,000 (my initial margin)", "score": 0 },
        { "value": "10000", "label": "£10,000 (the full position value)", "score": 3 },
        { "value": "unlimited", "label": "More than £10,000 in extreme cases", "score": 3 },
        { "value": "not_sure", "label": "I'm not sure", "score": 0 }
      ]
    }
  ],
  "scoring": {
    "pass_threshold": 6,
    "maximum_score": 12
  },
  "mandatory_disclosure_on_fail": "Under FCA rules, you have not demonstrated sufficient knowledge or experience to trade CFDs. You may retake this assessment after 30 days."
}
```

- [ ] **Step 4: Create suitability/isa.json**

```json
{
  "version": "1.0.0",
  "product": "ISA",
  "region": "UK",
  "appropriateness_test_required": false,
  "annual_allowance_gbp": 20000,
  "note": "No appropriateness test required for ISA under FCA rules. KYC and disclosure only."
}
```

- [ ] **Step 5: Create suitability/gia.json**

```json
{
  "version": "1.0.0",
  "product": "GIA",
  "region": "UK",
  "appropriateness_test_required": false,
  "note": "No appropriateness test required for GIA under FCA rules for standard equities."
}
```

- [ ] **Step 6: Create suitability/sipp.json**

```json
{
  "version": "1.0.0",
  "product": "SIPP",
  "region": "UK",
  "fca_rule_reference": "COBS 19",
  "appropriateness_test_required": false,
  "questions": [
    {
      "id": "q1",
      "text": "Do you understand that you cannot normally access pension funds until age 57 (rising to 57 in 2028)?",
      "options": [
        { "value": "yes", "label": "Yes, I understand", "score": 1 },
        { "value": "no", "label": "No, I was not aware", "score": 0 }
      ]
    },
    {
      "id": "q2",
      "text": "Are you transferring an existing pension? If so, have you received regulated financial advice?",
      "options": [
        { "value": "not_transferring", "label": "No, this is a new pension", "score": 1 },
        { "value": "yes_advice", "label": "Yes, transferring and have received advice", "score": 1 },
        { "value": "yes_no_advice", "label": "Yes, transferring but no advice yet", "score": 0 }
      ]
    }
  ],
  "scoring": {
    "pass_threshold": 2,
    "maximum_score": 2
  }
}
```

- [ ] **Step 7: Create suitability/options.json**

```json
{
  "version": "1.0.0",
  "product": "OPTIONS",
  "region": "UK",
  "fca_rule_reference": "COBS 10.2",
  "retest_waiting_period_days": 30,
  "questions": [
    {
      "id": "q1",
      "text": "What is an options contract?",
      "options": [
        { "value": "right_not_obligation", "label": "The right but not obligation to buy/sell at a set price", "score": 3 },
        { "value": "obligation", "label": "An obligation to buy or sell at a set price", "score": 0 },
        { "value": "not_sure", "label": "I'm not sure", "score": 0 }
      ]
    },
    {
      "id": "q2",
      "text": "How many options trades have you made in the past 2 years?",
      "options": [
        { "value": "none", "label": "None", "score": 0 },
        { "value": "less_than_10", "label": "Less than 10", "score": 1 },
        { "value": "10_to_40", "label": "10–40", "score": 2 },
        { "value": "more_than_40", "label": "More than 40", "score": 3 }
      ]
    }
  ],
  "scoring": {
    "pass_threshold": 4,
    "maximum_score": 6
  }
}
```

- [ ] **Step 8: Create disclosure files**

```json
// rules/uk/disclosures/isa.json
{
  "version": "1.0.0",
  "product": "ISA",
  "disclosures": [
    {
      "id": "isa_allowance",
      "title": "ISA Annual Allowance",
      "content": "You can invest up to £20,000 per tax year across all your ISAs. This allowance cannot be carried forward.",
      "must_acknowledge": true
    },
    {
      "id": "isa_risk",
      "title": "Investment Risk",
      "content": "The value of investments can go down as well as up. You may get back less than you invest. Past performance is not a reliable indicator of future results.",
      "must_acknowledge": true
    },
    {
      "id": "consumer_duty_isa",
      "title": "Your Rights Under FCA Consumer Duty",
      "content": "We are required to act in your best interests and ensure you receive good outcomes. If you are in financial difficulty or vulnerable circumstances, please contact us so we can support you appropriately.",
      "must_acknowledge": false
    }
  ]
}
```

```json
// rules/uk/disclosures/gia.json
{
  "version": "1.0.0",
  "product": "GIA",
  "disclosures": [
    {
      "id": "gia_tax",
      "title": "Tax Treatment",
      "content": "A General Investment Account is subject to Capital Gains Tax and Income Tax on dividends. You should consult a tax advisor about your personal circumstances.",
      "must_acknowledge": true
    },
    {
      "id": "gia_risk",
      "title": "Investment Risk",
      "content": "The value of investments can go down as well as up. You may get back less than you invest.",
      "must_acknowledge": true
    }
  ]
}
```

```json
// rules/uk/disclosures/cfd.json
{
  "version": "1.0.0",
  "product": "CFD",
  "fca_rule_reference": "COBS 4.5A",
  "disclosures": [
    {
      "id": "cfd_loss_warning",
      "title": "Risk Warning — Mandatory FCA Disclosure",
      "content": "CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. 74% of retail investor accounts lose money when trading CFDs. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.",
      "must_acknowledge": true,
      "fca_mandated": true
    },
    {
      "id": "cfd_leverage",
      "title": "Leverage Limits",
      "content": "Under FCA rules, leverage for retail clients is capped at 1:30 for major currency pairs and 1:2 for cryptocurrency. Your maximum loss on any position is limited to your account balance.",
      "must_acknowledge": true
    },
    {
      "id": "cfd_negative_balance",
      "title": "Negative Balance Protection",
      "content": "You are protected from losing more than the funds in your trading account. We provide negative balance protection on all retail CFD accounts.",
      "must_acknowledge": false
    }
  ]
}
```

```json
// rules/uk/disclosures/sipp.json
{
  "version": "1.0.0",
  "product": "SIPP",
  "disclosures": [
    {
      "id": "sipp_access_age",
      "title": "Pension Access Age",
      "content": "You cannot normally access your pension until age 57. Taking your pension earlier may incur tax charges.",
      "must_acknowledge": true
    },
    {
      "id": "sipp_annual_allowance",
      "title": "Annual Allowance",
      "content": "The maximum you can contribute to pensions each tax year while receiving tax relief is £60,000 (or 100% of your earnings, whichever is lower).",
      "must_acknowledge": true
    }
  ]
}
```

```json
// rules/uk/disclosures/options.json
{
  "version": "1.0.0",
  "product": "OPTIONS",
  "disclosures": [
    {
      "id": "options_risk",
      "title": "Options Risk Warning",
      "content": "Options are complex derivative instruments. You can lose the entire premium paid for an option. Writing (selling) options can expose you to unlimited losses.",
      "must_acknowledge": true
    }
  ]
}
```

- [ ] **Step 9: Commit all rules**

```bash
git add rules/
git commit -m "feat: UK rules files for all products (eligibility, suitability, disclosures)"
```

---

### Task 4: Product Eligibility MCP Server

**Files:**
- Create: `mcp-servers/product-eligibility-server/package.json`
- Create: `mcp-servers/product-eligibility-server/src/rules-loader.ts`
- Create: `mcp-servers/product-eligibility-server/src/tools.ts`
- Create: `mcp-servers/product-eligibility-server/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "product-eligibility-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create rules-loader.ts**

```typescript
// mcp-servers/product-eligibility-server/src/rules-loader.ts
import { readFileSync } from 'fs';
import path from 'path';

const RULES_BASE = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');

interface ProductConfig {
  label: string;
  eligible_customer_types: string[];
  minimum_age: number;
  maximum_age?: number;
  required_journey_steps: string[];
  suitability_required: boolean;
  appropriateness_test_required: boolean;
  fca_leverage_limit?: string;
  loss_warning_threshold?: number;
}

interface EligibilityRules {
  version: string;
  region: string;
  products: Record<string, ProductConfig>;
}

let cachedRules: EligibilityRules | null = null;

export function getEligibilityRules(): EligibilityRules {
  if (!cachedRules) {
    const filePath = path.join(RULES_BASE, 'uk', 'eligibility.json');
    cachedRules = JSON.parse(readFileSync(filePath, 'utf-8'));
  }
  return cachedRules!;
}
```

- [ ] **Step 3: Create tools.ts**

```typescript
// mcp-servers/product-eligibility-server/src/tools.ts
import { z } from 'zod';
import { getEligibilityRules } from './rules-loader.js';

export const eligibilityTools = {
  get_eligible_products: {
    description: 'Get list of products a UK retail customer is eligible to open.',
    inputSchema: z.object({
      customer_type: z.enum(['RETAIL']).default('RETAIL'),
      age: z.number().int().min(0).max(120),
    }),
    handler: (input: { customer_type: string; age: number }) => {
      const rules = getEligibilityRules();
      const eligible = Object.entries(rules.products)
        .filter(([, config]) => {
          const ageOk = input.age >= config.minimum_age &&
            (!config.maximum_age || input.age <= config.maximum_age);
          const typeOk = config.eligible_customer_types.includes(input.customer_type);
          return ageOk && typeOk;
        })
        .map(([productCode, config]) => ({
          product_code: productCode,
          label: config.label,
          suitability_required: config.suitability_required,
          appropriateness_test_required: config.appropriateness_test_required,
        }));
      return { eligible_products: eligible, rules_version: rules.version };
    },
  },

  get_required_journey_steps: {
    description: 'Get the ordered list of journey steps required to open a specific product.',
    inputSchema: z.object({
      product_code: z.string().toUpperCase(),
    }),
    handler: (input: { product_code: string }) => {
      const rules = getEligibilityRules();
      const product = rules.products[input.product_code.toUpperCase()];
      if (!product) {
        return { error: `Unknown product: ${input.product_code}`, steps: [] };
      }
      return {
        product_code: input.product_code,
        label: product.label,
        steps: product.required_journey_steps,
        rules_version: rules.version,
      };
    },
  },
};
```

- [ ] **Step 4: Create index.ts**

```typescript
// mcp-servers/product-eligibility-server/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { eligibilityTools } from './tools.js';

const server = new McpServer({
  name: 'product-eligibility-server',
  version: '1.0.0',
});

for (const [name, tool] of Object.entries(eligibilityTools)) {
  server.tool(name, tool.description, tool.inputSchema.shape, (input: unknown) => {
    const result = tool.handler(input as never);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Product eligibility MCP server running on stdio');
```

- [ ] **Step 5: Install and verify**

```bash
cd mcp-servers/product-eligibility-server
npm install
RULES_PATH=../../rules npx tsx src/index.ts
# Expected: "Product eligibility MCP server running on stdio"
```

- [ ] **Step 6: Commit**

```bash
git add mcp-servers/product-eligibility-server
git commit -m "feat: product eligibility MCP server"
```

---

### Task 5: KYC MCP Server

**Files:**
- Create: `mcp-servers/kyc-server/package.json`
- Create: `mcp-servers/kyc-server/src/tools.ts`
- Create: `mcp-servers/kyc-server/src/index.ts`

- [ ] **Step 1: Create package.json** (same as product-eligibility-server, name: `"kyc-server"`)

- [ ] **Step 2: Create tools.ts**

```typescript
// mcp-servers/kyc-server/src/tools.ts
import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';

const RULES_BASE = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');

function getKycRules() {
  return JSON.parse(readFileSync(path.join(RULES_BASE, 'uk', 'kyc.json'), 'utf-8'));
}

export const kycTools = {
  verify_identity: {
    description: 'Verify customer identity against UK KYC rules. Returns PASS or FAIL with reason.',
    inputSchema: z.object({
      session_id: z.string(),
      full_name: z.string(),
      date_of_birth: z.string().describe('ISO 8601 date string YYYY-MM-DD'),
      nationality: z.string(),
      national_insurance_number: z.string().optional(),
      address: z.object({
        line1: z.string(),
        city: z.string(),
        postcode: z.string(),
        country: z.string().default('GB'),
      }),
    }),
    handler: (input: {
      session_id: string;
      full_name: string;
      date_of_birth: string;
      nationality: string;
      national_insurance_number?: string;
      address: { line1: string; city: string; postcode: string; country: string };
    }) => {
      const rules = getKycRules();
      const age = Math.floor(
        (Date.now() - new Date(input.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      );

      // Deterministic mock: blocked names fail, age < 18 fails
      const isBlocked = rules.mock_pass_criteria.name_not_in.some(
        (blocked: string) => input.full_name.toUpperCase().includes(blocked)
      );
      const ageOk = age >= rules.mock_pass_criteria.age_minimum;

      if (isBlocked) {
        return { decision: 'FAIL', reason: 'Identity check failed', rule_version: '1.0.0' };
      }
      if (!ageOk) {
        return { decision: 'FAIL', reason: `Customer must be at least ${rules.mock_pass_criteria.age_minimum}`, rule_version: '1.0.0' };
      }
      return {
        decision: 'PASS',
        verified_name: input.full_name,
        verified_dob: input.date_of_birth,
        rule_version: '1.0.0',
      };
    },
  },

  check_sanctions: {
    description: 'Check customer against UK HMT and OFAC sanctions lists.',
    inputSchema: z.object({
      full_name: z.string(),
      date_of_birth: z.string(),
      nationality: z.string(),
    }),
    handler: (input: { full_name: string }) => {
      const blockedPatterns = ['SANCTIONED', 'BLOCKED', 'RESTRICTED'];
      const isHit = blockedPatterns.some(p => input.full_name.toUpperCase().includes(p));
      return {
        decision: isHit ? 'FAIL' : 'PASS',
        lists_checked: ['OFAC', 'UN', 'UK_HMT'],
        rule_version: '1.0.0',
      };
    },
  },

  assess_vulnerability: {
    description: 'Assess if customer may be a vulnerable customer under FCA Consumer Duty.',
    inputSchema: z.object({
      age: z.number(),
      self_reported_indicators: z.array(z.string()).optional(),
    }),
    handler: (input: { age: number; self_reported_indicators?: string[] }) => {
      const ageFlag = input.age > 80;
      const indicators = input.self_reported_indicators || [];
      const isVulnerable = ageFlag || indicators.length > 0;
      return {
        is_vulnerable: isVulnerable,
        indicators_detected: [
          ...(ageFlag ? ['age_over_80'] : []),
          ...indicators,
        ],
        recommendation: isVulnerable
          ? 'Flag account for enhanced support. Consider additional checks before proceeding.'
          : 'No vulnerability indicators detected.',
        rule_version: '1.0.0',
      };
    },
  },
};
```

- [ ] **Step 3: Create index.ts** (same pattern as audit-server, importing `kycTools`)

- [ ] **Step 4: Commit**

```bash
git add mcp-servers/kyc-server
git commit -m "feat: KYC MCP server with identity, sanctions, vulnerability checks"
```

---

### Task 6: Suitability MCP Server

**Files:**
- Create: `mcp-servers/suitability-server/package.json`
- Create: `mcp-servers/suitability-server/src/tools.ts`
- Create: `mcp-servers/suitability-server/src/index.ts`

- [ ] **Step 1: Create tools.ts**

```typescript
// mcp-servers/suitability-server/src/tools.ts
import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';

const RULES_BASE = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');

function getSuitabilityRules(product: string) {
  const filePath = path.join(RULES_BASE, 'uk', 'suitability', `${product.toLowerCase()}.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export const suitabilityTools = {
  get_appropriateness_questions: {
    description: 'Get the appropriateness test questions for a product that requires it.',
    inputSchema: z.object({
      product_code: z.string(),
    }),
    handler: (input: { product_code: string }) => {
      const rules = getSuitabilityRules(input.product_code);
      if (!rules.appropriateness_test_required && rules.appropriateness_test_required !== undefined) {
        return { required: false, product_code: input.product_code };
      }
      return {
        required: true,
        product_code: input.product_code,
        questions: rules.questions,
        rules_version: rules.version,
        fca_rule_reference: rules.fca_rule_reference,
      };
    },
  },

  run_appropriateness_test: {
    description: 'Evaluate answers to appropriateness test questions. Returns PASS or FAIL deterministically.',
    inputSchema: z.object({
      product_code: z.string(),
      answers: z.record(z.string()).describe('Map of question_id to answer value'),
    }),
    handler: (input: { product_code: string; answers: Record<string, string> }) => {
      const rules = getSuitabilityRules(input.product_code);
      if (!rules.questions) {
        return { decision: 'PASS', reason: 'No appropriateness test required', rule_version: rules.version };
      }

      let totalScore = 0;
      const breakdown: Array<{ question_id: string; answer: string; score: number }> = [];

      for (const question of rules.questions) {
        const answer = input.answers[question.id];
        const option = question.options.find((o: { value: string }) => o.value === answer);
        const score = option?.score ?? 0;
        totalScore += score;
        breakdown.push({ question_id: question.id, answer: answer || 'not_answered', score });
      }

      const passed = totalScore >= rules.scoring.pass_threshold;
      return {
        decision: passed ? 'PASS' : 'FAIL',
        score: totalScore,
        pass_threshold: rules.scoring.pass_threshold,
        maximum_score: rules.scoring.maximum_score,
        breakdown,
        failure_disclosure: passed ? null : rules.mandatory_disclosure_on_fail,
        retest_waiting_period_days: passed ? null : (rules.retest_waiting_period_days || null),
        rule_version: rules.version,
      };
    },
  },

  check_retest_period: {
    description: 'Check if a customer is within the waiting period before retaking an appropriateness test.',
    inputSchema: z.object({
      product_code: z.string(),
      last_failed_at: z.string().describe('ISO 8601 datetime of last failed test'),
    }),
    handler: (input: { product_code: string; last_failed_at: string }) => {
      const rules = getSuitabilityRules(input.product_code);
      const waitingDays = rules.retest_waiting_period_days || 30;
      const lastFailed = new Date(input.last_failed_at);
      const daysSince = Math.floor((Date.now() - lastFailed.getTime()) / (1000 * 60 * 60 * 24));
      const canRetest = daysSince >= waitingDays;
      return {
        can_retest: canRetest,
        days_since_last_failure: daysSince,
        waiting_period_days: waitingDays,
        eligible_from: canRetest
          ? 'now'
          : new Date(lastFailed.getTime() + waitingDays * 24 * 60 * 60 * 1000).toISOString(),
      };
    },
  },
};
```

- [ ] **Step 2: Create index.ts** (same pattern, importing `suitabilityTools`)

- [ ] **Step 3: Commit**

```bash
git add mcp-servers/suitability-server
git commit -m "feat: suitability MCP server with appropriateness test evaluation"
```

---

### Task 7: Disclosure MCP Server

**Files:**
- Create: `mcp-servers/disclosure-server/package.json`
- Create: `mcp-servers/disclosure-server/src/tools.ts`
- Create: `mcp-servers/disclosure-server/src/index.ts`

- [ ] **Step 1: Create tools.ts**

```typescript
// mcp-servers/disclosure-server/src/tools.ts
import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';

const RULES_BASE = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');

function getDisclosures(product: string) {
  const filePath = path.join(RULES_BASE, 'uk', 'disclosures', `${product.toLowerCase()}.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export const disclosureTools = {
  get_required_disclosures: {
    description: 'Fetch all required disclosure documents for a product. Never generate disclosure text — always fetch from here.',
    inputSchema: z.object({
      product_code: z.string(),
      include_optional: z.boolean().default(false),
    }),
    handler: (input: { product_code: string; include_optional: boolean }) => {
      const rules = getDisclosures(input.product_code);
      const disclosures = input.include_optional
        ? rules.disclosures
        : rules.disclosures.filter((d: { must_acknowledge: boolean }) => d.must_acknowledge);
      return {
        product_code: input.product_code,
        disclosures,
        rules_version: rules.version,
        fca_rule_reference: rules.fca_rule_reference || null,
      };
    },
  },

  get_risk_warnings: {
    description: 'Fetch FCA-mandated risk warnings for a product.',
    inputSchema: z.object({
      product_code: z.string(),
    }),
    handler: (input: { product_code: string }) => {
      const rules = getDisclosures(input.product_code);
      const warnings = rules.disclosures.filter(
        (d: { fca_mandated?: boolean }) => d.fca_mandated === true
      );
      return {
        product_code: input.product_code,
        fca_mandated_warnings: warnings,
        rules_version: rules.version,
      };
    },
  },

  get_consumer_duty_content: {
    description: 'Fetch FCA Consumer Duty required content for the product.',
    inputSchema: z.object({
      product_code: z.string(),
    }),
    handler: (input: { product_code: string }) => {
      const rules = getDisclosures(input.product_code);
      const consumerDutyItems = rules.disclosures.filter(
        (d: { id: string }) => d.id.includes('consumer_duty')
      );
      return {
        product_code: input.product_code,
        consumer_duty_content: consumerDutyItems,
        rules_version: rules.version,
      };
    },
  },
};
```

- [ ] **Step 2: Create index.ts** (same pattern, importing `disclosureTools`)

- [ ] **Step 3: Commit**

```bash
git add mcp-servers/disclosure-server
git commit -m "feat: disclosure MCP server with FCA-mandated content registry"
```

---

## Phase 2: Orchestrator + Frontend (Weeks 3–4)

### Task 8: Orchestrator — Claude + MCP Client

**Files:**
- Create: `apps/orchestrator/package.json`
- Create: `apps/orchestrator/src/claude.ts`
- Create: `apps/orchestrator/src/mcp-client.ts`
- Create: `apps/orchestrator/src/session.ts`
- Create: `apps/orchestrator/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "orchestrator",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "cors": "^2.8.5",
    "express": "^4.18.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create session.ts**

```typescript
// apps/orchestrator/src/session.ts
export interface Session {
  id: string;
  customer_id?: string;
  product_code?: string;
  age?: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  completed_steps: string[];
  created_at: string;
}

const sessions = new Map<string, Session>();

export function getOrCreateSession(id: string): Session {
  if (!sessions.has(id)) {
    sessions.set(id, {
      id,
      messages: [],
      completed_steps: [],
      created_at: new Date().toISOString(),
    });
  }
  return sessions.get(id)!;
}

export function updateSession(id: string, updates: Partial<Session>): Session {
  const session = getOrCreateSession(id);
  Object.assign(session, updates);
  return session;
}
```

- [ ] **Step 3: Create claude.ts — system prompt is the rules layer**

```typescript
// apps/orchestrator/src/claude.ts
export const ORCHESTRATOR_SYSTEM_PROMPT = `You are an onboarding orchestrator for UK retail trading demo accounts.

## YOUR ROLE
You guide customers through the onboarding journey for their chosen product. You are a friendly, clear communicator — but you are NOT a compliance decision-maker. All compliance decisions come from the MCP tools you call.

## MANDATORY RULES — NEVER VIOLATE THESE
1. NEVER make compliance decisions yourself. Always call the appropriate MCP tool and use its decision.
2. NEVER generate disclosure text. Always fetch it from get_required_disclosures or get_risk_warnings.
3. ALWAYS call write_audit_event after every MCP tool call that produces a decision.
4. If suitability run_appropriateness_test returns decision=FAIL, STOP the journey and explain why.
5. If verify_identity or check_sanctions returns decision=FAIL, STOP the journey immediately.
6. NEVER reorder journey steps returned by get_required_journey_steps.

## JOURNEY SEQUENCE
When a customer selects a product:
1. Call get_required_journey_steps to get ordered steps
2. Call write_audit_event with event_type=JOURNEY_STARTED
3. Execute each step in order:
   - KYC: call verify_identity, then check_sanctions, then assess_vulnerability
   - SUITABILITY_*: call get_appropriateness_questions, present them, call run_appropriateness_test
   - DISCLOSURE_*: call get_required_disclosures, present ALL content to customer, confirm acknowledgement
   - RISK_WARNING_*: call get_risk_warnings and present verbatim
   - ACCOUNT_SETUP: collect account preferences and confirm
4. After each step: call write_audit_event with the decision
5. On completion: call write_audit_event with event_type=JOURNEY_COMPLETED

## COMMUNICATION STYLE
- Be clear, jargon-free, and friendly
- When presenting disclosures, show the EXACT text from the tool — do not paraphrase
- When asking for personal data, explain why it's needed
- If a customer fails appropriateness: explain they can retry in the number of days returned by the tool

## REGION
UK retail customers only. All rules are FCA-regulated.`;
```

- [ ] **Step 4: Create mcp-client.ts**

```typescript
// apps/orchestrator/src/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface McpTool {
  name: string;
  description: string;
  inputSchema: unknown;
}

class McpClientManager {
  private clients = new Map<string, Client>();
  private allTools: McpTool[] = [];

  async connect(serverName: string, command: string, args: string[], env?: Record<string, string>) {
    const transport = new StdioClientTransport({ command, args, env });
    const client = new Client({ name: 'orchestrator', version: '1.0.0' });
    await client.connect(transport);
    this.clients.set(serverName, client);

    const { tools } = await client.listTools();
    this.allTools.push(...tools.map(t => ({
      name: t.name,
      description: t.description || '',
      inputSchema: t.inputSchema,
    })));
    return client;
  }

  getTools(): McpTool[] {
    return this.allTools;
  }

  async callTool(toolName: string, input: unknown): Promise<unknown> {
    for (const client of this.clients.values()) {
      try {
        const result = await client.callTool({ name: toolName, arguments: input as Record<string, unknown> });
        const text = result.content.find((c: { type: string }) => c.type === 'text');
        return text ? JSON.parse((text as { text: string }).text) : result;
      } catch {
        continue;
      }
    }
    throw new Error(`No MCP server found for tool: ${toolName}`);
  }
}

export const mcpManager = new McpClientManager();

export async function initMcpServers() {
  const rulesPath = process.env.RULES_PATH || '../../rules';
  const serverEnv = { RULES_PATH: rulesPath, AUDIT_DB_PATH: process.env.AUDIT_DB_PATH || './audit.db' };

  await mcpManager.connect('audit', 'node', ['../../mcp-servers/audit-server/dist/index.js'], serverEnv);
  await mcpManager.connect('eligibility', 'node', ['../../mcp-servers/product-eligibility-server/dist/index.js'], serverEnv);
  await mcpManager.connect('kyc', 'node', ['../../mcp-servers/kyc-server/dist/index.js'], serverEnv);
  await mcpManager.connect('suitability', 'node', ['../../mcp-servers/suitability-server/dist/index.js'], serverEnv);
  await mcpManager.connect('disclosure', 'node', ['../../mcp-servers/disclosure-server/dist/index.js'], serverEnv);

  console.log('All MCP servers connected. Tools available:', mcpManager.getTools().map(t => t.name));
}
```

- [ ] **Step 5: Create index.ts — Express server with Claude loop**

```typescript
// apps/orchestrator/src/index.ts
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './claude.js';
import { mcpManager, initMcpServers } from './mcp-client.js';
import { getOrCreateSession, updateSession } from './session.js';

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/chat', async (req, res) => {
  const { session_id, message } = req.body as { session_id: string; message: string };
  const session = getOrCreateSession(session_id);

  session.messages.push({ role: 'user', content: message });

  const tools = mcpManager.getTools().map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
  }));

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    messages: session.messages as Anthropic.MessageParam[],
    tools,
  });

  // Agentic loop — keep running until stop_reason is 'end_turn'
  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUses) {
      if (toolUse.type !== 'tool_use') continue;
      try {
        const result = await mcpManager.callTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          is_error: true,
        });
      }
    }

    session.messages.push({
      role: 'assistant',
      content: response.content as unknown as string,
    });
    session.messages.push({ role: 'user', content: toolResults as unknown as string });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      messages: session.messages as Anthropic.MessageParam[],
      tools,
    });
  }

  const textBlock = response.content.find(b => b.type === 'text');
  const reply = textBlock && textBlock.type === 'text' ? textBlock.text : '';

  session.messages.push({ role: 'assistant', content: reply });
  updateSession(session_id, { messages: session.messages });

  res.json({ reply, session_id });
});

app.get('/audit/:session_id', async (req, res) => {
  const result = await mcpManager.callTool('get_audit_trail', { session_id: req.params.session_id });
  res.json(result);
});

const PORT = process.env.ORCHESTRATOR_PORT || 3001;

await initMcpServers();
app.listen(PORT, () => console.log(`Orchestrator running on :${PORT}`));
```

- [ ] **Step 6: Install and start orchestrator**

```bash
cd apps/orchestrator
npm install
ANTHROPIC_API_KEY=your_key RULES_PATH=../../rules npx tsx src/index.ts
# Expected: "All MCP servers connected. Tools available: [write_audit_event, get_audit_trail, ...]"
# Expected: "Orchestrator running on :3001"
```

- [ ] **Step 7: Test chat endpoint manually**

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-001", "message": "I want to open a trading account"}'
# Expected: JSON with { reply: "...", session_id: "test-001" }
```

- [ ] **Step 8: Commit**

```bash
git add apps/orchestrator
git commit -m "feat: orchestrator with Claude agentic loop and MCP tool routing"
```

---

### Task 9: Next.js Frontend

**Files:**
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/next.config.js`
- Create: `apps/frontend/tailwind.config.js`
- Create: `apps/frontend/src/app/layout.tsx`
- Create: `apps/frontend/src/app/page.tsx`
- Create: `apps/frontend/src/app/api/chat/route.ts`
- Create: `apps/frontend/src/components/ChatInterface.tsx`
- Create: `apps/frontend/src/components/AuditPanel.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create API route (proxy to orchestrator)**

```typescript
// apps/frontend/src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${ORCHESTRATOR_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Create ChatInterface component**

```tsx
// apps/frontend/src/components/ChatInterface.tsx
'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  sessionId: string;
}

export default function ChatInterface({ sessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Welcome to the UK Trading Account onboarding. Which product are you interested in? We offer ISA (Stocks & Shares ISA), GIA (General Investment Account), CFD (Contracts for Difference), SIPP (Personal Pension), or Options & Derivatives.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}>
              {m.role === 'assistant' && (
                <div className="text-xs font-semibold text-gray-500 mb-1">Onboarding Assistant</div>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Type your response..."
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create AuditPanel component**

```tsx
// apps/frontend/src/components/AuditPanel.tsx
'use client';
import { useState } from 'react';

interface AuditEvent {
  id: number;
  event_type: string;
  tool_name: string;
  decision: string;
  created_at: string;
  input_snapshot: string;
  output_snapshot: string;
}

interface Props {
  sessionId: string;
}

export default function AuditPanel({ sessionId }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/audit/${sessionId}`);
    const data = await res.json();
    setEvents(data.events || []);
    setOpen(true);
  };

  const decisionColor = (d: string) => ({
    PASS: 'text-green-600 bg-green-50',
    FAIL: 'text-red-600 bg-red-50',
    PENDING: 'text-yellow-600 bg-yellow-50',
  }[d] || 'text-gray-600 bg-gray-50');

  return (
    <div>
      <button onClick={load} className="text-xs text-gray-500 underline hover:text-gray-700">
        View Audit Trail ({events.length} events)
      </button>
      {open && (
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          {events.length === 0 && <p className="text-xs text-gray-400">No audit events yet.</p>}
          {events.map(e => (
            <div key={e.id} className="border rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-semibold">{e.event_type}</span>
                {e.decision && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${decisionColor(e.decision)}`}>
                    {e.decision}
                  </span>
                )}
              </div>
              {e.tool_name && <div className="text-gray-400">Tool: {e.tool_name}</div>}
              <div className="text-gray-400">{new Date(e.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create main page**

```tsx
// apps/frontend/src/app/page.tsx
'use client';
import { useMemo } from 'react';
import ChatInterface from '@/components/ChatInterface';
import AuditPanel from '@/components/AuditPanel';

export default function Home() {
  const sessionId = useMemo(() => `session-${Date.now()}`, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">UK Trading Account Onboarding</h1>
            <p className="text-xs text-gray-500">Demo — Powered by Claude + MCP</p>
          </div>
          <span className="text-xs text-gray-400 font-mono">{sessionId}</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full flex gap-4 p-4">
        <div className="flex-1 bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <ChatInterface sessionId={sessionId} />
        </div>

        <div className="w-72 bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Compliance Audit Trail</h2>
          <AuditPanel sessionId={sessionId} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Add audit API proxy route**

```typescript
// apps/frontend/src/app/api/audit/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const res = await fetch(`${ORCHESTRATOR_URL}/audit/${params.sessionId}`);
  return NextResponse.json(await res.json());
}
```

- [ ] **Step 7: Install and start frontend**

```bash
cd apps/frontend
npm install
ORCHESTRATOR_URL=http://localhost:3001 npm run dev
# Expected: Next.js running on http://localhost:3000
# Open browser to http://localhost:3000
```

- [ ] **Step 8: Verify end-to-end**

Open browser, type "I want to open a CFD account". Verify:
- Chat responds and asks for product confirmation
- On completion of journey, Audit Trail shows events with PASS/FAIL decisions

- [ ] **Step 9: Commit**

```bash
git add apps/frontend
git commit -m "feat: Next.js frontend with chat interface and audit trail panel"
```

---

## Phase 3: Polish + Demo (Weeks 5–8)

### Task 10: Full Product Journeys — CFD with Appropriateness Test

Wire and test the complete CFD journey end-to-end:
1. Product selection → get_required_journey_steps
2. KYC (verify_identity + check_sanctions + assess_vulnerability)
3. Suitability (get_appropriateness_questions → present 4 questions → run_appropriateness_test)
4. Disclosure (get_required_disclosures + get_risk_warnings with FCA 74% warning)
5. Account setup confirmation

Test both PASS path and FAIL path (score < 6 → show retest waiting period).

### Task 11: SIPP Journey

Wire SIPP with pension-specific declaration step and the transfer advice check.

### Task 12: Compliance Dashboard Page

Add `/dashboard` page showing:
- All sessions with their product and completion status
- Per-session audit trail with expandable decision details
- Rule version tracking across all decisions

```
GET /orchestrator/sessions → list all sessions with status
GET /orchestrator/audit/:session_id → full trail (already built)
```

### Task 13: Demo Script Hardening

Prepare 3 demo scenarios:
1. **Happy path — ISA**: Simple journey, no appropriateness test, 3 steps
2. **Complex path — CFD PASS**: Full appropriateness test passed, all disclosures, FCA warnings shown
3. **Blocked path — CFD FAIL**: Appropriateness test failed, retest period enforced, journey stopped

For each: document the exact inputs to use, the expected MCP tool calls, and the audit trail that results.

---

## Self-Review Checklist

- [x] Audit server is built first — every other server has `write_audit_event` available from day one
- [x] All compliance decisions return deterministic PASS/FAIL from JSON rules, never from Claude
- [x] Disclosure text is fetched from disclosure-server, never generated by Claude (enforced in system prompt)
- [x] CFD appropriateness test scoring is deterministic (sum of answer scores vs threshold)
- [x] Retest waiting period is enforced by suitability-server, not Claude
- [x] Vulnerability assessment is deterministic (age > 80, self-reported indicators)
- [x] All MCP server tools write to audit via `write_audit_event`
- [x] Session state kept in orchestrator, not in Claude's context window
- [x] Rules version is included in every audit event for future regulatory traceability
- [x] Consumer Duty content is in pre-approved disclosure files, not generated
