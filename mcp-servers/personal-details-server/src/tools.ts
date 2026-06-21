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
