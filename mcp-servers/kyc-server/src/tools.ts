import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';

const RULES_BASE = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');
const KYC_RULES = JSON.parse(readFileSync(path.join(RULES_BASE, 'uk', 'kyc.json'), 'utf-8'));

export const kycTools = {
  verify_identity: {
    description: 'Verify customer identity against UK KYC rules. Returns PASS or FAIL with reason.',
    inputSchema: z.object({
      session_id: z.string(),
      full_name: z.string(),
      date_of_birth: z.string().describe('ISO 8601 date YYYY-MM-DD'),
      nationality: z.string(),
      national_insurance_number: z.string().optional(),
      address: z.object({ line1: z.string(), city: z.string(), postcode: z.string(), country: z.string().default('GB') }),
    }),
    handler: (input: { full_name: string; date_of_birth: string }) => {
      const age = Math.floor((Date.now() - new Date(input.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      const isBlocked = KYC_RULES.mock_pass_criteria.name_not_in.some((b: string) => input.full_name.toUpperCase().includes(b));
      if (isBlocked) return { decision: 'FAIL', reason: 'Identity check failed', rule_version: '1.0.0' };
      if (age < KYC_RULES.mock_pass_criteria.age_minimum) return { decision: 'FAIL', reason: `Must be at least ${KYC_RULES.mock_pass_criteria.age_minimum}`, rule_version: '1.0.0' };
      return { decision: 'PASS', verified_name: input.full_name, verified_dob: input.date_of_birth, rule_version: '1.0.0' };
    },
  },
  check_sanctions: {
    description: 'Check customer against UK HMT and OFAC sanctions lists.',
    inputSchema: z.object({ full_name: z.string(), date_of_birth: z.string(), nationality: z.string() }),
    handler: (input: { full_name: string }) => {
      const blocked = ['SANCTIONED', 'BLOCKED', 'RESTRICTED'];
      const isHit = blocked.some(p => input.full_name.toUpperCase().includes(p));
      return { decision: isHit ? 'FAIL' : 'PASS', lists_checked: ['OFAC', 'UN', 'UK_HMT'], rule_version: '1.0.0' };
    },
  },
  assess_vulnerability: {
    description: 'Assess if customer may be a vulnerable customer under FCA Consumer Duty.',
    inputSchema: z.object({ age: z.number(), self_reported_indicators: z.array(z.string()).optional() }),
    handler: (input: { age: number; self_reported_indicators?: string[] }) => {
      const ageFlag = input.age > 80;
      const indicators = input.self_reported_indicators || [];
      const isVulnerable = ageFlag || indicators.length > 0;
      return {
        is_vulnerable: isVulnerable,
        indicators_detected: [...(ageFlag ? ['age_over_80'] : []), ...indicators],
        recommendation: isVulnerable ? 'Flag account for enhanced support.' : 'No vulnerability indicators detected.',
        rule_version: '1.0.0',
      };
    },
  },
};
