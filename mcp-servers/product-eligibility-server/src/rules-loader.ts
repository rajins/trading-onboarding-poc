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
