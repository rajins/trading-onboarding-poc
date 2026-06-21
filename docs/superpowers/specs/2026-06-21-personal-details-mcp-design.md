# Personal Details MCP Server — Design Spec

**Date:** 2026-06-21  
**Status:** Approved  
**Scope:** New `personal-details-server` MCP + rules file + integration with existing orchestrator

---

## Problem

The existing `kyc-server` makes compliance decisions (PASS/FAIL) but has no structured owner for collecting, storing, or validating customer PII. Personal details are currently passed ad-hoc by the orchestrator directly into `verify_identity`. This means:

- No persistent customer profile (details lost between sessions)
- No field-level validation before KYC (bad data reaches the compliance engine)
- No audit trail for data collection events separate from compliance decisions
- PII is held in plaintext in session memory

---

## Design Goals

- Collect personal details **once per customer** (client-level, not session- or product-level)
- Validate fields against UK regulatory patterns before passing to KYC
- Store PII with **field-level AES-256-GCM encryption** at rest
- Emit distinct audit events for data collection vs. compliance decisions
- Integrate as a new first journey step (`PERSONAL_DETAILS`) before KYC for all products

---

## Architecture

```
CLAUDE ORCHESTRATOR
       │
       ├─1─► get_required_fields(customer_id, intended_products[])
       │         returns field list + which are conditionally required
       │
       ├─2─► save_personal_details(customer_id, { ...fields })   [called incrementally]
       │         encrypts each field → data/personal-details/{customer_id}.json
       │
       ├─3─► validate_personal_details(customer_id)
       │         decrypts, runs full validation
       │         returns: { valid, errors: [{ field, reason }] }
       │         Claude loops, re-asks failing fields, calls save again
       │
       ├─4─► get_personal_details(customer_id)
       │         returns decrypted CustomerProfile
       │
       └─5─► verify_identity(CustomerProfile)    ← fed directly to kyc-server
             check_sanctions(CustomerProfile)
```

**Key separation:** personal-details-server owns PII. kyc-server owns compliance decisions. No shared state — the orchestrator is the explicit handoff.

---

## MCP Tools

### `get_required_fields`
```
Input:  { customer_id: string, intended_products: string[] }
Output: {
  required: FieldDefinition[],
  conditional: { field: string, required_because: string[] }[],
  rules_version: string
}
```
Returns the full client-level field set. `conditional` lists fields triggered by the intended products (e.g. `annual_income_band` required because `["CFD", "OPTIONS"]` in scope).

---

### `save_personal_details`
```
Input:  { customer_id: string, fields: Partial<PersonalDetails> }
Output: { saved_fields: string[], customer_id: string }
```
Accepts partial data. Encrypts each field individually (AES-256-GCM, unique IV per field). Creates or merges into `data/personal-details/{customer_id}.json`. Emits `PERSONAL_DETAILS_FIELD_SAVED` audit event. If `pep_declaration.is_pep=true` emits `PEP_FLAGGED`; if `us_person_fatca.is_us_person=true` emits `FATCA_FLAGGED`.

---

### `validate_personal_details`
```
Input:  { customer_id: string, intended_products: string[] }
Output: {
  valid: boolean,
  errors: { field: string, reason: string }[],
  customer_id: string,
  rules_version: string
}
```
Decrypts all saved fields and runs every validation rule. Returns all errors in one pass. Emits `PERSONAL_DETAILS_VALIDATED` or `PERSONAL_DETAILS_VALIDATION_FAILED`.

---

### `get_personal_details`
```
Input:  { customer_id: string }
Output: CustomerProfile (all fields decrypted)
```
Used by the orchestrator to feed `verify_identity` and `check_sanctions` without re-asking the customer. Never logged to audit (contains raw PII).

---

## Fields

### Always Required (all customers)

| Field | Type | Validation |
|-------|------|------------|
| `full_name` | string | non-empty, ≤ 100 chars |
| `date_of_birth` | ISO 8601 date | age ≥ 18 at today |
| `nationality` | ISO 3166-1 alpha-2 | valid country code |
| `national_insurance_number` | string | `^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z][0-9]{6}[A-D]$` |
| `address.line1` | string | non-empty |
| `address.city` | string | non-empty |
| `address.postcode` | string | UK postcode regex `^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$` |
| `address.country` | ISO 3166-1 alpha-2 | default `GB` |
| `employment_status` | enum | `employed \| self_employed \| retired \| student \| unemployed \| director` |
| `pep_declaration.is_pep` | boolean | required |
| `pep_declaration.details` | string | required if `is_pep=true` |
| `us_person_fatca.is_us_person` | boolean | required |
| `us_person_fatca.tin` | string | required if `is_us_person=true` |
| `marketing_preferences` | `{ email, sms, phone }` booleans | no constraints, defaults false |

### Conditionally Required

| Field | Type | Required when |
|-------|------|---------------|
| `annual_income_band` | enum | product in `[CFD, SIPP, OPTIONS]` |
| `source_of_wealth` | enum | product in `[CFD, SIPP, OPTIONS]` |
| `tax_residency` | ISO 3166-1 alpha-2 | product in `[SIPP, GIA]` or non-UK nationality |

**Income band enum:** `under_25k | 25k_50k | 50k_100k | 100k_250k | over_250k`  
**Source of wealth enum:** `employment | self_employment | inheritance | investment_returns | business_sale | other`

---

## Encryption & Storage

**Algorithm:** AES-256-GCM (Node.js built-in `crypto` — no extra dependencies)  
**Key:** `PERSONAL_DETAILS_ENCRYPTION_KEY` env var — 64-char hex (32 bytes). If absent, a random key is generated per process start and a console warning is emitted.  
**IV:** 12-byte random per field per write  
**Auth tag:** 16 bytes, stored alongside ciphertext — detects field-level tampering

**File on disk:**
```json
{
  "customer_id": "cust-abc123",
  "schema_version": "1.0.0",
  "created_at": "2026-06-21T10:00:00Z",
  "updated_at": "2026-06-21T10:05:00Z",
  "fields": {
    "full_name":   { "iv": "...", "ciphertext": "...", "auth_tag": "..." },
    "date_of_birth": { "iv": "...", "ciphertext": "...", "auth_tag": "..." }
  }
}
```

**Why field-level:** each field decryptable independently; mirrors real PII vault (field-level tokenisation); audit events can reference field names without exposing values.

---

## Audit Events

| Event type | Emitted by | When |
|------------|-----------|------|
| `PERSONAL_DETAILS_FIELD_SAVED` | `save_personal_details` | on every save call (lists field names only, not values) |
| `PEP_FLAGGED` | `save_personal_details` | `pep_declaration.is_pep=true` |
| `FATCA_FLAGGED` | `save_personal_details` | `us_person_fatca.is_us_person=true` |
| `PERSONAL_DETAILS_VALIDATED` | `validate_personal_details` | validation passes |
| `PERSONAL_DETAILS_VALIDATION_FAILED` | `validate_personal_details` | validation fails (errors list included, no PII) |

---

## Journey Integration

**New journey step order (all products):**
```
PERSONAL_DETAILS → KYC → [SUITABILITY] → DISCLOSURE → [RISK_WARNING] → ACCOUNT_SETUP
```

`get_required_journey_steps` in `product-eligibility-server` updated to prepend `PERSONAL_DETAILS` for all products.

**Orchestrator system prompt additions:**
- `PERSONAL_DETAILS` step handler: call `get_required_fields`, collect conversationally, call `save_personal_details` incrementally, call `validate_personal_details`, loop on errors, then `write_audit_event(PERSONAL_DETAILS_COMPLETED)`
- KYC step: call `get_personal_details(customer_id)` and pass profile directly into `verify_identity` and `check_sanctions` — do not re-ask the customer

**PEP handling:** if `is_pep=true`, journey continues (not blocked at this layer) but `PEP_FLAGGED` is in the audit trail. The audit panel will surface this for demo purposes.  
**FATCA handling:** if `is_us_person=true`, `FATCA_FLAGGED` emitted. US persons are warned but not blocked in the POC.

---

## New Files

```
mcp-servers/personal-details-server/
├── src/
│   ├── index.ts         # MCP bootstrap (same pattern as other servers)
│   ├── tools.ts         # 4 tools: get_required_fields, save, validate, get
│   ├── store.ts         # AES-256-GCM encrypt/decrypt + JSON file read/write
│   └── validator.ts     # Field validation: NI regex, UK postcode, enums, age
├── package.json         # Same deps as kyc-server + no extras
└── tsconfig.json        # { "extends": "../tsconfig.base.json" }

rules/uk/personal-details.json   # Field definitions, enums, required_if_products triggers
```

**Modified files:**
- `mcp-servers/product-eligibility-server/src/tools.ts` — prepend `PERSONAL_DETAILS` step
- `apps/orchestrator/src/mcp-client.ts` — add `connectServer('personal-details', ...)` 
- `apps/orchestrator/src/prompt.ts` — add `PERSONAL_DETAILS` step instructions
- `.env.example` — add `PERSONAL_DETAILS_ENCRYPTION_KEY` and `PERSONAL_DETAILS_PATH`
- `docker-compose.yml` — not needed (personal-details-server is stdio, launched by orchestrator)

---

## Out of Scope (POC)

- Document upload / OCR verification (address proof, ID documents)
- Re-verification on personal detail change
- Cross-session customer ID resolution (customer_id is provided by the orchestrator for now)
- GDPR right-to-erasure endpoint
