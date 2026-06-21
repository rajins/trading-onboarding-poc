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
