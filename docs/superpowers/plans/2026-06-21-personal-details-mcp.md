# Personal Details MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `personal-details-server` MCP that collects, encrypts (AES-256-GCM field-level), stores, and validates UK retail customer personal details before passing a `CustomerProfile` to the existing KYC server.

**Architecture:** New stdio MCP server with 4 tools (`get_required_fields`, `save_personal_details`, `validate_personal_details`, `get_personal_details`). Each field encrypted independently to `data/personal-details/{customer_id}.json`. Plugs into the existing orchestrator as the first journey step (`PERSONAL_DETAILS`) before KYC.

**Tech Stack:** TypeScript · Node.js `crypto` (built-in, no extra deps) · Zod · `@modelcontextprotocol/sdk` · `tsx`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `rules/uk/personal-details.json` | Field definitions, enums, conditional triggers per product |
| Create | `mcp-servers/personal-details-server/package.json` | Package manifest (mirrors kyc-server) |
| Create | `mcp-servers/personal-details-server/tsconfig.json` | Extends `../tsconfig.base.json` |
| Create | `mcp-servers/personal-details-server/src/store.ts` | AES-256-GCM encrypt/decrypt + JSON file read/write |
| Create | `mcp-servers/personal-details-server/src/validator.ts` | Field validation: NI regex, UK postcode, enums, age, conditionals |
| Create | `mcp-servers/personal-details-server/src/tools.ts` | 4 MCP tools with Zod schemas |
| Create | `mcp-servers/personal-details-server/src/index.ts` | MCP server bootstrap |
| Modify | `rules/uk/eligibility.json` | Prepend `PERSONAL_DETAILS` to every product's `required_journey_steps` |
| Modify | `mcp-servers/product-eligibility-server/src/tools.ts` | No code change needed — rules file drives the steps |
| Modify | `apps/orchestrator/src/mcp-client.ts` | Add `connectServer('personal-details', ...)` |
| Modify | `apps/orchestrator/src/prompt.ts` | Add `PERSONAL_DETAILS` step instructions |
| Modify | `.env.example` | Add `PERSONAL_DETAILS_ENCRYPTION_KEY` and `PERSONAL_DETAILS_PATH` |

---

## Task 1: Rules File

**Files:**
- Create: `rules/uk/personal-details.json`

- [ ] **Step 1: Create the rules file**

```json
{
  "version": "1.0.0",
  "region": "UK",
  "fields": {
    "full_name":                  { "type": "string",  "always_required": true },
    "date_of_birth":              { "type": "date",    "always_required": true },
    "nationality":                { "type": "iso3166", "always_required": true },
    "national_insurance_number":  { "type": "ni",      "always_required": true },
    "address":                    { "type": "address", "always_required": true },
    "employment_status":          { "type": "enum",    "always_required": true,
                                    "values": ["employed","self_employed","retired","student","unemployed","director"] },
    "annual_income_band":         { "type": "enum",    "always_required": false,
                                    "required_if_products": ["CFD","SIPP","OPTIONS"],
                                    "values": ["under_25k","25k_50k","50k_100k","100k_250k","over_250k"] },
    "source_of_wealth":           { "type": "enum",    "always_required": false,
                                    "required_if_products": ["CFD","SIPP","OPTIONS"],
                                    "values": ["employment","self_employment","inheritance","investment_returns","business_sale","other"] },
    "tax_residency":              { "type": "iso3166", "always_required": false,
                                    "required_if_products": ["SIPP","GIA"] },
    "pep_declaration":            { "type": "pep",     "always_required": true },
    "us_person_fatca":            { "type": "fatca",   "always_required": true },
    "marketing_preferences":      { "type": "marketing","always_required": true }
  }
}
```

Save to `rules/uk/personal-details.json`.

- [ ] **Step 2: Commit**

```bash
git add rules/uk/personal-details.json
git commit -m "feat: add personal-details rules file"
```

---

## Task 2: Project Scaffold

**Files:**
- Create: `mcp-servers/personal-details-server/package.json`
- Create: `mcp-servers/personal-details-server/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "personal-details-server",
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

Save to `mcp-servers/personal-details-server/package.json`.

- [ ] **Step 2: Create tsconfig.json**

```json
{ "extends": "../tsconfig.base.json" }
```

Save to `mcp-servers/personal-details-server/tsconfig.json`.

- [ ] **Step 3: Create src directory and install**

```bash
mkdir -p mcp-servers/personal-details-server/src
npm install
```

- [ ] **Step 4: Commit**

```bash
git add mcp-servers/personal-details-server/package.json mcp-servers/personal-details-server/tsconfig.json package-lock.json
git commit -m "feat: scaffold personal-details-server package"
```

---

## Task 3: Encryption Store (`store.ts`)

**Files:**
- Create: `mcp-servers/personal-details-server/src/store.ts`

- [ ] **Step 1: Create store.ts**

```typescript
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const STORE_PATH = process.env.PERSONAL_DETAILS_PATH
  || path.resolve(process.cwd(), '../../data/personal-details');

function getKey(): Buffer {
  const raw = process.env.PERSONAL_DETAILS_ENCRYPTION_KEY;
  if (!raw) {
    console.error('[personal-details] WARNING: PERSONAL_DETAILS_ENCRYPTION_KEY not set. Using insecure dev key.');
    return Buffer.alloc(32, 'dev-key-do-not-use-in-production!!');
  }
  if (raw.length !== 64) throw new Error('PERSONAL_DETAILS_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return Buffer.from(raw, 'hex');
}

const KEY = getKey();

interface EncryptedField {
  iv: string;
  ciphertext: string;
  auth_tag: string;
}

interface PersonalDetailsFile {
  customer_id: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  fields: Record<string, EncryptedField>;
}

export function encryptField(value: unknown): EncryptedField {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const plaintext = JSON.stringify(value);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const auth_tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    auth_tag: auth_tag.toString('hex'),
  };
}

export function decryptField(encrypted: EncryptedField): unknown {
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(encrypted.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encrypted.auth_tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function saveFields(customerId: string, fields: Record<string, unknown>): void {
  fs.mkdirSync(STORE_PATH, { recursive: true });
  const filePath = path.join(STORE_PATH, `${customerId}.json`);
  let profile: PersonalDetailsFile;
  if (fs.existsSync(filePath)) {
    profile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } else {
    profile = {
      customer_id: customerId,
      schema_version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: '',
      fields: {},
    };
  }
  for (const [key, value] of Object.entries(fields)) {
    profile.fields[key] = encryptField(value);
  }
  profile.updated_at = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
}

export function loadFields(customerId: string): Record<string, unknown> {
  const filePath = path.join(STORE_PATH, `${customerId}.json`);
  if (!fs.existsSync(filePath)) return {};
  const profile: PersonalDetailsFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const result: Record<string, unknown> = {};
  for (const [key, encrypted] of Object.entries(profile.fields)) {
    result[key] = decryptField(encrypted);
  }
  return result;
}

export function customerExists(customerId: string): boolean {
  return fs.existsSync(path.join(STORE_PATH, `${customerId}.json`));
}
```

Save to `mcp-servers/personal-details-server/src/store.ts`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mcp-servers/personal-details-server
npx tsc --noEmit
cd ../..
```

Expected: no errors.

- [ ] **Step 3: Smoke-test encrypt/decrypt round-trip**

Create a temp test file `mcp-servers/personal-details-server/src/_test_store.ts`:

```typescript
import { encryptField, decryptField, saveFields, loadFields } from './store.js';

// Round-trip test
const original = { line1: '10 Downing St', city: 'London', postcode: 'SW1A 2AA', country: 'GB' };
const encrypted = encryptField(original);
const decrypted = decryptField(encrypted);
console.assert(JSON.stringify(decrypted) === JSON.stringify(original), 'round-trip failed');

// Save/load test
saveFields('test-cust-001', { full_name: 'Jane Smith', address: original });
const loaded = loadFields('test-cust-001');
console.assert(loaded.full_name === 'Jane Smith', 'full_name mismatch');
console.assert(JSON.stringify(loaded.address) === JSON.stringify(original), 'address mismatch');

console.log('✓ store tests passed');
```

```bash
cd mcp-servers/personal-details-server
npx tsx src/_test_store.ts
```

Expected: `✓ store tests passed`

- [ ] **Step 4: Delete temp test file and commit**

```bash
rm mcp-servers/personal-details-server/src/_test_store.ts
rm -rf data/personal-details/test-cust-001.json
git add mcp-servers/personal-details-server/src/store.ts
git commit -m "feat: personal-details AES-256-GCM field-level store"
```

---

## Task 4: Field Validator (`validator.ts`)

**Files:**
- Create: `mcp-servers/personal-details-server/src/validator.ts`

- [ ] **Step 1: Create validator.ts**

```typescript
import { readFileSync } from 'fs';
import path from 'path';

const RULES_BASE = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');
const RULES = JSON.parse(readFileSync(path.join(RULES_BASE, 'uk', 'personal-details.json'), 'utf-8'));

const NI_REGEX = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z][0-9]{6}[A-D]$/;
const POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/;
const ISO3166_REGEX = /^[A-Z]{2}$/;

export interface ValidationError {
  field: string;
  reason: string;
}

function err(field: string, reason: string): ValidationError {
  return { field, reason };
}

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function validateFields(
  fields: Record<string, unknown>,
  intendedProducts: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // full_name
  if (!fields.full_name || typeof fields.full_name !== 'string' || fields.full_name.trim().length === 0) {
    errors.push(err('full_name', 'Full name is required'));
  } else if ((fields.full_name as string).length > 100) {
    errors.push(err('full_name', 'Full name must be 100 characters or fewer'));
  }

  // date_of_birth
  if (!fields.date_of_birth || typeof fields.date_of_birth !== 'string') {
    errors.push(err('date_of_birth', 'Date of birth is required (YYYY-MM-DD)'));
  } else if (isNaN(Date.parse(fields.date_of_birth as string))) {
    errors.push(err('date_of_birth', 'Date of birth must be a valid ISO date (YYYY-MM-DD)'));
  } else if (ageFromDob(fields.date_of_birth as string) < 18) {
    errors.push(err('date_of_birth', 'Customer must be at least 18 years old'));
  }

  // nationality
  if (!fields.nationality || !ISO3166_REGEX.test((fields.nationality as string)?.toUpperCase())) {
    errors.push(err('nationality', 'Nationality must be a valid ISO 3166-1 alpha-2 country code (e.g. GB, FR)'));
  }

  // national_insurance_number
  const ni = ((fields.national_insurance_number as string) || '').toUpperCase().replace(/\s/g, '');
  if (!ni) {
    errors.push(err('national_insurance_number', 'National Insurance number is required'));
  } else if (!NI_REGEX.test(ni)) {
    errors.push(err('national_insurance_number', 'National Insurance number is invalid (format: AB123456C)'));
  }

  // address
  const addr = fields.address as Record<string, string> | undefined;
  if (!addr) {
    errors.push(err('address', 'Address is required'));
  } else {
    if (!addr.line1?.trim()) errors.push(err('address.line1', 'Address line 1 is required'));
    if (!addr.city?.trim())  errors.push(err('address.city',  'City is required'));
    if (!addr.postcode?.trim()) {
      errors.push(err('address.postcode', 'Postcode is required'));
    } else if (!POSTCODE_REGEX.test(addr.postcode.trim().toUpperCase())) {
      errors.push(err('address.postcode', 'Postcode is not a valid UK postcode (e.g. SW1A 1AA)'));
    }
    if (addr.country && !ISO3166_REGEX.test(addr.country.toUpperCase())) {
      errors.push(err('address.country', 'Country must be a valid ISO 3166-1 alpha-2 code'));
    }
  }

  // employment_status
  const empEnum = RULES.fields.employment_status.values as string[];
  if (!fields.employment_status || !empEnum.includes(fields.employment_status as string)) {
    errors.push(err('employment_status', `Employment status must be one of: ${empEnum.join(', ')}`));
  }

  // annual_income_band — conditional
  const needsIncome = intendedProducts.some(p => RULES.fields.annual_income_band.required_if_products.includes(p));
  if (needsIncome) {
    const incomeEnum = RULES.fields.annual_income_band.values as string[];
    if (!fields.annual_income_band || !incomeEnum.includes(fields.annual_income_band as string)) {
      errors.push(err('annual_income_band', `Required for ${intendedProducts.join('/')}. Must be one of: ${incomeEnum.join(', ')}`));
    }
  }

  // source_of_wealth — conditional
  const needsWealth = intendedProducts.some(p => RULES.fields.source_of_wealth.required_if_products.includes(p));
  if (needsWealth) {
    const wealthEnum = RULES.fields.source_of_wealth.values as string[];
    if (!fields.source_of_wealth || !wealthEnum.includes(fields.source_of_wealth as string)) {
      errors.push(err('source_of_wealth', `Required for ${intendedProducts.join('/')}. Must be one of: ${wealthEnum.join(', ')}`));
    }
  }

  // tax_residency — conditional
  const needsTax = intendedProducts.some(p => RULES.fields.tax_residency.required_if_products.includes(p));
  if (needsTax) {
    if (!fields.tax_residency || !ISO3166_REGEX.test((fields.tax_residency as string)?.toUpperCase())) {
      errors.push(err('tax_residency', `Required for ${intendedProducts.join('/')}. Must be a valid ISO 3166-1 alpha-2 country code`));
    }
  }

  // pep_declaration
  const pep = fields.pep_declaration as { is_pep?: boolean; details?: string } | undefined;
  if (!pep || typeof pep.is_pep !== 'boolean') {
    errors.push(err('pep_declaration.is_pep', 'PEP declaration is required (true or false)'));
  } else if (pep.is_pep === true && !pep.details?.trim()) {
    errors.push(err('pep_declaration.details', 'Details required when is_pep is true'));
  }

  // us_person_fatca
  const fatca = fields.us_person_fatca as { is_us_person?: boolean; tin?: string } | undefined;
  if (!fatca || typeof fatca.is_us_person !== 'boolean') {
    errors.push(err('us_person_fatca.is_us_person', 'FATCA declaration is required (true or false)'));
  } else if (fatca.is_us_person === true && !fatca.tin?.trim()) {
    errors.push(err('us_person_fatca.tin', 'US Tax Identification Number (TIN) required when is_us_person is true'));
  }

  // marketing_preferences — no constraints, defaults to false if missing
  // No validation errors, just accepted as-is

  return errors;
}

export function getRequiredFields(intendedProducts: string[]): {
  required: string[];
  conditional: { field: string; required_because: string[] }[];
} {
  const required: string[] = [];
  const conditional: { field: string; required_because: string[] }[] = [];

  for (const [fieldName, def] of Object.entries(RULES.fields) as [string, Record<string, unknown>][]) {
    if (def.always_required) {
      required.push(fieldName);
    } else {
      const triggers = (def.required_if_products as string[]) || [];
      const matched = intendedProducts.filter(p => triggers.includes(p));
      if (matched.length > 0) {
        conditional.push({ field: fieldName, required_because: matched });
      }
    }
  }

  return { required, conditional };
}
```

Save to `mcp-servers/personal-details-server/src/validator.ts`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mcp-servers/personal-details-server
npx tsc --noEmit
cd ../..
```

Expected: no errors.

- [ ] **Step 3: Smoke-test validator**

Create `mcp-servers/personal-details-server/src/_test_validator.ts`:

```typescript
import { validateFields } from './validator.js';

// Valid full record for CFD
const valid = {
  full_name: 'Jane Smith',
  date_of_birth: '1990-06-15',
  nationality: 'GB',
  national_insurance_number: 'AB123456C',
  address: { line1: '10 Downing St', city: 'London', postcode: 'SW1A 2AA', country: 'GB' },
  employment_status: 'employed',
  annual_income_band: '50k_100k',
  source_of_wealth: 'employment',
  pep_declaration: { is_pep: false },
  us_person_fatca: { is_us_person: false },
  marketing_preferences: { email: true, sms: false, phone: false },
};
const e1 = validateFields(valid, ['CFD']);
console.assert(e1.length === 0, `Expected 0 errors, got: ${JSON.stringify(e1)}`);

// Invalid NI + missing income band for CFD
const invalid = { ...valid, national_insurance_number: 'ZZ000000Z', annual_income_band: undefined };
const e2 = validateFields(invalid, ['CFD']);
const hasNiError = e2.some(e => e.field === 'national_insurance_number');
const hasIncomeError = e2.some(e => e.field === 'annual_income_band');
console.assert(hasNiError, 'Expected NI error');
console.assert(hasIncomeError, 'Expected income band error');

// PEP true but no details
const pepInvalid = { ...valid, pep_declaration: { is_pep: true } };
const e3 = validateFields(pepInvalid, ['ISA']);
console.assert(e3.some(e => e.field === 'pep_declaration.details'), 'Expected PEP details error');

console.log('✓ validator tests passed');
```

```bash
cd mcp-servers/personal-details-server
RULES_PATH=../../rules npx tsx src/_test_validator.ts
cd ../..
```

Expected: `✓ validator tests passed`

- [ ] **Step 4: Delete temp test file and commit**

```bash
rm mcp-servers/personal-details-server/src/_test_validator.ts
git add mcp-servers/personal-details-server/src/validator.ts
git commit -m "feat: personal-details field validator (NI, postcode, enums, age, conditionals)"
```

---

## Task 5: MCP Tools (`tools.ts`)

**Files:**
- Create: `mcp-servers/personal-details-server/src/tools.ts`

- [ ] **Step 1: Create tools.ts**

```typescript
import { z } from 'zod';
import { saveFields, loadFields, customerExists } from './store.js';
import { validateFields, getRequiredFields } from './validator.js';

const AddressSchema = z.object({
  line1: z.string(),
  city: z.string(),
  postcode: z.string(),
  country: z.string().default('GB'),
});

const FieldsSchema = z.object({
  full_name:                  z.string().optional(),
  date_of_birth:              z.string().optional(),
  nationality:                z.string().optional(),
  national_insurance_number:  z.string().optional(),
  address:                    AddressSchema.optional(),
  employment_status:          z.string().optional(),
  annual_income_band:         z.string().optional(),
  source_of_wealth:           z.string().optional(),
  tax_residency:              z.string().optional(),
  pep_declaration:            z.object({ is_pep: z.boolean(), details: z.string().optional() }).optional(),
  us_person_fatca:            z.object({ is_us_person: z.boolean(), tin: z.string().optional() }).optional(),
  marketing_preferences:      z.object({ email: z.boolean().default(false), sms: z.boolean().default(false), phone: z.boolean().default(false) }).optional(),
});

export const personalDetailsTools = {
  get_required_fields: {
    description: 'Get the list of personal detail fields required for this customer. Call at the start of the PERSONAL_DETAILS journey step.',
    inputSchema: z.object({
      customer_id: z.string(),
      intended_products: z.array(z.string()).describe('Products the customer intends to open, e.g. ["CFD"]'),
    }),
    handler: (input: { customer_id: string; intended_products: string[] }) => {
      const { required, conditional } = getRequiredFields(input.intended_products);
      const already_saved = customerExists(input.customer_id)
        ? Object.keys(loadFields(input.customer_id))
        : [];
      return {
        customer_id: input.customer_id,
        required_fields: required,
        conditional_fields: conditional,
        already_saved,
        rules_version: '1.0.0',
      };
    },
  },

  save_personal_details: {
    description: 'Save one or more personal detail fields for a customer. Encrypts each field. Call incrementally as the customer provides answers. Emits audit flags for PEP and FATCA.',
    inputSchema: z.object({
      customer_id: z.string(),
      fields: FieldsSchema,
    }),
    handler: (input: { customer_id: string; fields: Record<string, unknown> }) => {
      const nonNull: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input.fields)) {
        if (v !== undefined && v !== null) nonNull[k] = v;
      }
      saveFields(input.customer_id, nonNull);

      const flags: string[] = [];
      const pep = input.fields.pep_declaration as { is_pep?: boolean } | undefined;
      if (pep?.is_pep === true) flags.push('PEP_FLAGGED');
      const fatca = input.fields.us_person_fatca as { is_us_person?: boolean } | undefined;
      if (fatca?.is_us_person === true) flags.push('FATCA_FLAGGED');

      return {
        customer_id: input.customer_id,
        saved_fields: Object.keys(nonNull),
        compliance_flags: flags,
      };
    },
  },

  validate_personal_details: {
    description: 'Validate all saved personal details for a customer against UK rules. Returns PASS or list of field errors. Call after collecting all fields, then loop on errors.',
    inputSchema: z.object({
      customer_id: z.string(),
      intended_products: z.array(z.string()),
    }),
    handler: (input: { customer_id: string; intended_products: string[] }) => {
      const fields = loadFields(input.customer_id);
      const errors = validateFields(fields, input.intended_products);
      return {
        customer_id: input.customer_id,
        valid: errors.length === 0,
        errors,
        rules_version: '1.0.0',
      };
    },
  },

  get_personal_details: {
    description: 'Retrieve decrypted personal details for a customer. Use to pass CustomerProfile into verify_identity and check_sanctions — do NOT re-ask the customer for fields already saved here.',
    inputSchema: z.object({
      customer_id: z.string(),
    }),
    handler: (input: { customer_id: string }) => {
      const fields = loadFields(input.customer_id);
      if (Object.keys(fields).length === 0) {
        return { customer_id: input.customer_id, found: false, profile: null };
      }
      return { customer_id: input.customer_id, found: true, profile: fields };
    },
  },
};
```

Save to `mcp-servers/personal-details-server/src/tools.ts`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mcp-servers/personal-details-server
npx tsc --noEmit
cd ../..
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mcp-servers/personal-details-server/src/tools.ts
git commit -m "feat: personal-details MCP tools (get_required_fields, save, validate, get)"
```

---

## Task 6: MCP Server Bootstrap (`index.ts`)

**Files:**
- Create: `mcp-servers/personal-details-server/src/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { personalDetailsTools } from './tools.js';

const server = new McpServer({ name: 'personal-details-server', version: '1.0.0' });

for (const [name, tool] of Object.entries(personalDetailsTools)) {
  server.tool(name, tool.description, tool.inputSchema.shape, (input: unknown) => {
    const result = tool.handler(input as never);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Personal details MCP server running on stdio');
```

Save to `mcp-servers/personal-details-server/src/index.ts`.

- [ ] **Step 2: Smoke-test the server starts**

```bash
cd mcp-servers/personal-details-server
RULES_PATH=../../rules npx tsx src/index.ts &
sleep 2
kill %1
cd ../..
```

Expected: prints `Personal details MCP server running on stdio` to stderr, no crash.

- [ ] **Step 3: Commit**

```bash
git add mcp-servers/personal-details-server/src/index.ts
git commit -m "feat: personal-details MCP server bootstrap"
```

---

## Task 7: Update Eligibility Rules

**Files:**
- Modify: `rules/uk/eligibility.json`

- [ ] **Step 1: Prepend `PERSONAL_DETAILS` to every product's `required_journey_steps`**

Open `rules/uk/eligibility.json`. For every product, update `required_journey_steps` to add `"PERSONAL_DETAILS"` as the first element:

```json
{
  "version": "1.0.0",
  "region": "UK",
  "products": {
    "ISA": {
      "label": "Stocks & Shares ISA",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "required_journey_steps": ["PERSONAL_DETAILS", "KYC", "DISCLOSURE_ISA", "ACCOUNT_SETUP"],
      "suitability_required": false,
      "appropriateness_test_required": false
    },
    "GIA": {
      "label": "General Investment Account",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "required_journey_steps": ["PERSONAL_DETAILS", "KYC", "DISCLOSURE_GIA", "ACCOUNT_SETUP"],
      "suitability_required": false,
      "appropriateness_test_required": false
    },
    "CFD": {
      "label": "Contracts for Difference",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "required_journey_steps": [
        "PERSONAL_DETAILS", "KYC", "SUITABILITY_CFD", "DISCLOSURE_CFD", "RISK_WARNING_CFD", "ACCOUNT_SETUP"
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
        "PERSONAL_DETAILS", "KYC", "SUITABILITY_SIPP", "DISCLOSURE_SIPP", "PENSION_DECLARATION", "ACCOUNT_SETUP"
      ],
      "suitability_required": true,
      "appropriateness_test_required": false
    },
    "OPTIONS": {
      "label": "Options & Derivatives",
      "eligible_customer_types": ["RETAIL"],
      "minimum_age": 18,
      "required_journey_steps": [
        "PERSONAL_DETAILS", "KYC", "SUITABILITY_OPTIONS", "DISCLOSURE_OPTIONS", "RISK_WARNING_OPTIONS", "ACCOUNT_SETUP"
      ],
      "suitability_required": true,
      "appropriateness_test_required": true
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rules/uk/eligibility.json
git commit -m "feat: prepend PERSONAL_DETAILS step to all product journeys"
```

---

## Task 8: Wire into Orchestrator

**Files:**
- Modify: `apps/orchestrator/src/mcp-client.ts`
- Modify: `apps/orchestrator/src/prompt.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add personal-details-server to mcp-client.ts**

In `apps/orchestrator/src/mcp-client.ts`, inside `initMcpServers()`, add one line to the `Promise.all` array:

```typescript
export async function initMcpServers() {
  await Promise.all([
    connectServer('audit',            path.join(MCP_SERVERS_BASE, 'audit-server')),
    connectServer('eligibility',      path.join(MCP_SERVERS_BASE, 'product-eligibility-server')),
    connectServer('personal-details', path.join(MCP_SERVERS_BASE, 'personal-details-server')),
    connectServer('kyc',              path.join(MCP_SERVERS_BASE, 'kyc-server')),
    connectServer('suitability',      path.join(MCP_SERVERS_BASE, 'suitability-server')),
    connectServer('disclosure',       path.join(MCP_SERVERS_BASE, 'disclosure-server')),
  ]);
  console.log(`[MCP] All servers connected. Tools: ${allTools.map(t => t.name).join(', ')}`);
}
```

- [ ] **Step 2: Update orchestrator system prompt**

In `apps/orchestrator/src/prompt.ts`, update the `JOURNEY SEQUENCE` section. Replace the existing Step 3 KYC bullet with:

```typescript
export const SYSTEM_PROMPT = `You are an onboarding orchestrator for UK retail trading demo accounts.

## YOUR ROLE
You guide customers through the onboarding journey for their chosen product. You are a friendly, clear communicator — but you are NOT a compliance decision-maker. All compliance decisions come from the MCP tools you call.

## MANDATORY RULES — NEVER VIOLATE THESE
1. NEVER make compliance decisions yourself. Always call the appropriate MCP tool and use its decision.
2. NEVER generate disclosure text. Always fetch it from get_required_disclosures or get_risk_warnings.
3. ALWAYS call write_audit_event after every MCP tool call that produces a decision or compliance flag.
4. If run_appropriateness_test returns decision=FAIL, STOP the journey and explain why using the failure_disclosure from the tool response.
5. If verify_identity or check_sanctions returns decision=FAIL, STOP the journey immediately.
6. NEVER reorder journey steps returned by get_required_journey_steps.
7. NEVER ask the customer for fields already saved in personal details — always call get_personal_details first.

## JOURNEY SEQUENCE
When a customer selects a product:
1. Call get_required_journey_steps to get ordered steps
2. Call write_audit_event with event_type=JOURNEY_STARTED
3. Execute each step in order:
   - PERSONAL_DETAILS:
     a. Call get_required_fields(customer_id, intended_products) to learn what is needed
     b. Collect fields conversationally — explain why each is needed (UK regulatory requirement)
     c. Call save_personal_details incrementally as the customer provides answers
     d. When all fields collected, call validate_personal_details
     e. If valid=false, re-ask only the failing fields, call save_personal_details again, re-validate
     f. On valid=true, call write_audit_event with event_type=PERSONAL_DETAILS_COMPLETED
     g. If compliance_flags contains PEP_FLAGGED: inform the customer their account is flagged for enhanced due diligence (do NOT stop the journey)
     h. If compliance_flags contains FATCA_FLAGGED: inform the customer their US person status has been noted
   - KYC:
     a. Call get_personal_details(customer_id) to retrieve the saved profile
     b. Pass profile fields directly into verify_identity and check_sanctions — do NOT re-ask the customer
     c. Call assess_vulnerability with the customer's age from the profile
     d. Call write_audit_event after each tool with its decision
   - SUITABILITY_*: call get_appropriateness_questions, present them one by one, collect answers, call run_appropriateness_test
   - DISCLOSURE_*: call get_required_disclosures, present ALL disclosure content verbatim, confirm customer acknowledgement
   - RISK_WARNING_*: call get_risk_warnings and present the exact text verbatim
   - ACCOUNT_SETUP: confirm account preferences and complete
4. After each step: call write_audit_event with the decision
5. On completion: call write_audit_event with event_type=JOURNEY_COMPLETED

## CUSTOMER ID
Use the session_id as the customer_id for all personal-details tool calls.

## COMMUNICATION STYLE
- Be clear, jargon-free, and friendly
- When collecting personal details, group related questions naturally (e.g. address fields together)
- When presenting disclosures, show the EXACT text from the tool — do not paraphrase or summarise
- When asking for personal data, explain why it is needed (e.g. "We need your National Insurance number as required by UK AML regulations")
- If a customer fails appropriateness: show exactly the failure_disclosure text from the tool result

## REGION
UK retail customers only. All rules are FCA-regulated.`;
```

- [ ] **Step 3: Update .env.example**

Add two lines to `.env.example`:

```env
ANTHROPIC_API_KEY=your_key_here
ORCHESTRATOR_PORT=3001
FRONTEND_PORT=3000
AUDIT_DB_PATH=./data/audit.db
PERSONAL_DETAILS_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
PERSONAL_DETAILS_PATH=./data/personal-details
```

Note: the all-zeros key above is the dev placeholder — production deployments must generate a real key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] **Step 4: Verify orchestrator TypeScript compiles**

```bash
cd apps/orchestrator
npx tsc --noEmit
cd ../..
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/orchestrator/src/mcp-client.ts apps/orchestrator/src/prompt.ts .env.example
git commit -m "feat: wire personal-details-server into orchestrator and update system prompt"
```

---

## Task 9: End-to-End Smoke Test

- [ ] **Step 1: Start the orchestrator**

```bash
cd apps/orchestrator
npx tsx src/index.ts
```

Expected output (order may vary):
```
[MCP] Connected: audit (3 tools)
[MCP] Connected: eligibility (2 tools)
[MCP] Connected: personal-details (4 tools)
[MCP] Connected: kyc (3 tools)
[MCP] Connected: suitability (3 tools)
[MCP] Connected: disclosure (3 tools)
[MCP] All servers connected. Tools: write_audit_event, get_audit_trail, ..., get_required_fields, save_personal_details, validate_personal_details, get_personal_details, ...
Orchestrator running on :3001
```

- [ ] **Step 2: Verify personal-details tools are registered**

```bash
curl -s http://localhost:3001/sessions | python3 -m json.tool
```

Expected: `{ "sessions": [] }` — orchestrator is up.

- [ ] **Step 3: Start the frontend**

```bash
# In a new terminal, from project root
cd apps/frontend
../../node_modules/.bin/next dev
```

Open [http://localhost:3000](http://localhost:3000).

- [ ] **Step 4: Run an ISA journey and verify personal details collection**

In the chat:
> "I want to open an ISA"

Expected conversational flow:
1. Claude calls `get_required_journey_steps` → returns `["PERSONAL_DETAILS", "KYC", "DISCLOSURE_ISA", "ACCOUNT_SETUP"]`
2. Claude calls `get_required_fields` → returns required field list
3. Claude asks for full name, date of birth, NI number, address, employment status, PEP declaration, FATCA declaration, marketing preferences
4. Claude calls `save_personal_details` incrementally
5. Claude calls `validate_personal_details` → `{ valid: true }`
6. Claude calls `get_personal_details` and passes profile to `verify_identity` and `check_sanctions`
7. Journey continues to disclosure and account setup

- [ ] **Step 5: Verify encrypted file was created**

```bash
ls data/personal-details/
cat data/personal-details/session-*.json
```

Expected: JSON file with `fields` containing objects with `iv`, `ciphertext`, `auth_tag` — no plaintext PII visible.

- [ ] **Step 6: Commit smoke test confirmation and push**

```bash
git add -A
git commit -m "feat: personal-details-server complete — field-level encryption, validation, journey integration"
git push origin main
```
