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
      product_code: z.string(),
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
