import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';

const RULES_BASE = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');
function getDisclosures(product: string) {
  return JSON.parse(readFileSync(path.join(RULES_BASE, 'uk', 'disclosures', `${product.toLowerCase()}.json`), 'utf-8'));
}

export const disclosureTools = {
  get_required_disclosures: {
    description: "Fetch all required disclosure documents for a product. Never generate disclosure text — always fetch from here.",
    inputSchema: z.object({ product_code: z.string(), include_optional: z.boolean().default(false) }),
    handler: (input: { product_code: string; include_optional: boolean }) => {
      const rules = getDisclosures(input.product_code);
      const disclosures = input.include_optional
        ? rules.disclosures
        : rules.disclosures.filter((d: { must_acknowledge: boolean }) => d.must_acknowledge);
      return { product_code: input.product_code, disclosures, rules_version: rules.version, fca_rule_reference: rules.fca_rule_reference || null };
    },
  },
  get_risk_warnings: {
    description: 'Fetch FCA-mandated risk warnings for a product.',
    inputSchema: z.object({ product_code: z.string() }),
    handler: (input: { product_code: string }) => {
      const rules = getDisclosures(input.product_code);
      const warnings = rules.disclosures.filter((d: { fca_mandated?: boolean }) => d.fca_mandated === true);
      return { product_code: input.product_code, fca_mandated_warnings: warnings, rules_version: rules.version };
    },
  },
  get_consumer_duty_content: {
    description: 'Fetch FCA Consumer Duty required content for the product.',
    inputSchema: z.object({ product_code: z.string() }),
    handler: (input: { product_code: string }) => {
      const rules = getDisclosures(input.product_code);
      const items = rules.disclosures.filter((d: { id: string }) => d.id.includes('consumer_duty'));
      return { product_code: input.product_code, consumer_duty_content: items, rules_version: rules.version };
    },
  },
};
