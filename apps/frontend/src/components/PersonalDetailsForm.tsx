'use client';
import { useState } from 'react';

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'director', label: 'Company Director' },
];

const INCOME_OPTIONS = [
  { value: 'under_25k', label: 'Under £25,000' },
  { value: '25k_50k', label: '£25,000 – £50,000' },
  { value: '50k_100k', label: '£50,000 – £100,000' },
  { value: '100k_250k', label: '£100,000 – £250,000' },
  { value: 'over_250k', label: 'Over £250,000' },
];

const WEALTH_OPTIONS = [
  { value: 'employment', label: 'Employment income' },
  { value: 'self_employment', label: 'Self-employment income' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'investment_returns', label: 'Investment returns' },
  { value: 'business_sale', label: 'Business sale' },
  { value: 'other', label: 'Other' },
];

const COUNTRY_OPTIONS = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
  { value: 'SG', label: 'Singapore' },
  { value: 'JP', label: 'Japan' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'OTHER', label: 'Other' },
];

const NEEDS_INCOME_WEALTH = ['CFD', 'SIPP', 'OPTIONS'];
const NEEDS_TAX_RESIDENCY = ['SIPP', 'GIA'];

interface FormData {
  full_name: string;
  date_of_birth: string;
  nationality: string;
  national_insurance_number: string;
  address_line1: string;
  address_city: string;
  address_postcode: string;
  employment_status: string;
  annual_income_band: string;
  source_of_wealth: string;
  tax_residency: string;
  pep_declaration: boolean;
  us_person_fatca: boolean;
  marketing_preferences: boolean;
}

const EMPTY: FormData = {
  full_name: '',
  date_of_birth: '',
  nationality: 'GB',
  national_insurance_number: '',
  address_line1: '',
  address_city: '',
  address_postcode: '',
  employment_status: '',
  annual_income_band: '',
  source_of_wealth: '',
  tax_residency: 'GB',
  pep_declaration: false,
  us_person_fatca: false,
  marketing_preferences: false,
};

export default function PersonalDetailsForm({
  productCode,
  onSubmit,
  submitting,
}: {
  productCode: string;
  onSubmit: (fields: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const needsIncomeWealth = NEEDS_INCOME_WEALTH.includes(productCode);
  const needsTaxResidency = NEEDS_TAX_RESIDENCY.includes(productCode);

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.full_name.trim()) e.full_name = 'Required';
    if (!form.date_of_birth) e.date_of_birth = 'Required';
    if (!form.nationality) e.nationality = 'Required';
    if (!form.national_insurance_number.match(/^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D\s]$/i))
      e.national_insurance_number = 'Enter a valid NI number (e.g. AB123456C)';
    if (!form.address_line1.trim()) e.address_line1 = 'Required';
    if (!form.address_city.trim()) e.address_city = 'Required';
    if (!form.address_postcode.match(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i))
      e.address_postcode = 'Enter a valid UK postcode';
    if (!form.employment_status) e.employment_status = 'Required';
    if (needsIncomeWealth && !form.annual_income_band) e.annual_income_band = 'Required for this product';
    if (needsIncomeWealth && !form.source_of_wealth) e.source_of_wealth = 'Required for this product';
    if (needsTaxResidency && !form.tax_residency) e.tax_residency = 'Required for this product';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const fields: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      date_of_birth: form.date_of_birth,
      nationality: form.nationality,
      national_insurance_number: form.national_insurance_number.toUpperCase().replace(/\s/g, ''),
      address: `${form.address_line1.trim()}, ${form.address_city.trim()}, ${form.address_postcode.trim().toUpperCase()}`,
      employment_status: form.employment_status,
      pep_declaration: form.pep_declaration,
      us_person_fatca: form.us_person_fatca,
      marketing_preferences: form.marketing_preferences,
    };
    if (needsIncomeWealth) {
      fields.annual_income_band = form.annual_income_band;
      fields.source_of_wealth = form.source_of_wealth;
    }
    if (needsTaxResidency) fields.tax_residency = form.tax_residency;
    onSubmit(fields);
  };

  const field = (label: string, error?: string, required = true) => (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );

  const inputCls = (err?: string) =>
    `border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-400' : 'border-gray-200'}`;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-5 pb-3 border-b">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">{productCode}</span>
          <h2 className="text-sm font-semibold text-gray-900">Personal Details</h2>
        </div>
        <p className="text-xs text-gray-400">FCA-required information. All fields are encrypted at rest.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        {/* Full name */}
        <div className="flex flex-col gap-1">
          {field('Full legal name', errors.full_name)}
          <input className={inputCls(errors.full_name)} value={form.full_name}
            onChange={e => set('full_name', e.target.value)} placeholder="As it appears on your ID" />
        </div>

        {/* DOB */}
        <div className="flex flex-col gap-1">
          {field('Date of birth', errors.date_of_birth)}
          <input type="date" className={inputCls(errors.date_of_birth)} value={form.date_of_birth}
            onChange={e => set('date_of_birth', e.target.value)} max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().split('T')[0]} />
        </div>

        {/* Nationality */}
        <div className="flex flex-col gap-1">
          {field('Nationality', errors.nationality)}
          <select className={inputCls(errors.nationality)} value={form.nationality}
            onChange={e => set('nationality', e.target.value)}>
            {COUNTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* NI Number */}
        <div className="flex flex-col gap-1">
          {field('National Insurance number', errors.national_insurance_number)}
          <input className={inputCls(errors.national_insurance_number)} value={form.national_insurance_number}
            onChange={e => set('national_insurance_number', e.target.value)} placeholder="AB 12 34 56 C"
            maxLength={9} />
        </div>

        {/* Address */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Address<span className="text-red-500 ml-0.5">*</span></label>
          <input className={`${inputCls(errors.address_line1)} mb-1`} value={form.address_line1}
            onChange={e => set('address_line1', e.target.value)} placeholder="Street address" />
          {errors.address_line1 && <p className="text-xs text-red-500">{errors.address_line1}</p>}
          <div className="flex gap-2">
            <input className={`${inputCls(errors.address_city)} flex-1`} value={form.address_city}
              onChange={e => set('address_city', e.target.value)} placeholder="City" />
            <input className={`${inputCls(errors.address_postcode)} w-28`} value={form.address_postcode}
              onChange={e => set('address_postcode', e.target.value)} placeholder="Postcode" />
          </div>
          {errors.address_city && <p className="text-xs text-red-500">{errors.address_city}</p>}
          {errors.address_postcode && <p className="text-xs text-red-500">{errors.address_postcode}</p>}
        </div>

        {/* Employment */}
        <div className="flex flex-col gap-1">
          {field('Employment status', errors.employment_status)}
          <select className={inputCls(errors.employment_status)} value={form.employment_status}
            onChange={e => set('employment_status', e.target.value)}>
            <option value="">Select…</option>
            {EMPLOYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Conditional: income + source of wealth */}
        {needsIncomeWealth && (
          <>
            <div className="flex flex-col gap-1">
              {field('Annual income band', errors.annual_income_band)}
              <select className={inputCls(errors.annual_income_band)} value={form.annual_income_band}
                onChange={e => set('annual_income_band', e.target.value)}>
                <option value="">Select…</option>
                {INCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              {field('Source of wealth', errors.source_of_wealth)}
              <select className={inputCls(errors.source_of_wealth)} value={form.source_of_wealth}
                onChange={e => set('source_of_wealth', e.target.value)}>
                <option value="">Select…</option>
                {WEALTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Conditional: tax residency */}
        {needsTaxResidency && (
          <div className="flex flex-col gap-1">
            {field('Tax residency country', errors.tax_residency)}
            <select className={inputCls(errors.tax_residency)} value={form.tax_residency}
              onChange={e => set('tax_residency', e.target.value)}>
              {COUNTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        {/* Declarations */}
        <div className="rounded-xl border bg-gray-50 p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Declarations</p>
          {[
            { key: 'pep_declaration' as const, label: 'I am, or am closely associated with, a Politically Exposed Person (PEP).' },
            { key: 'us_person_fatca' as const, label: 'I am a US person for FATCA purposes (US citizen, resident, or green card holder).' },
            { key: 'marketing_preferences' as const, label: 'I consent to receiving marketing communications about products and offers.' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form[key] as boolean}
                onChange={e => set(key, e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs text-gray-700 leading-relaxed">{label}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded-xl px-5 py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit personal details'}
        </button>
      </form>
    </div>
  );
}
