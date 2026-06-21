'use client';

const PRODUCTS = [
  {
    code: 'ISA',
    label: 'Stocks & Shares ISA',
    description: 'Tax-efficient investing with your annual ISA allowance.',
    badge: 'No test required',
    badgeColor: 'bg-green-100 text-green-700',
    steps: 'Personal Details → KYC → Disclosure → Account',
  },
  {
    code: 'GIA',
    label: 'General Investment Account',
    description: 'Flexible investing with no contribution limits.',
    badge: 'No test required',
    badgeColor: 'bg-green-100 text-green-700',
    steps: 'Personal Details → KYC → Disclosure → Account',
  },
  {
    code: 'CFD',
    label: 'Contracts for Difference',
    description: 'Trade on price movements with leverage. FCA regulated.',
    badge: 'Appropriateness test · COBS 10.2',
    badgeColor: 'bg-amber-100 text-amber-700',
    steps: 'Personal Details → KYC → Suitability → Disclosure → Account',
  },
  {
    code: 'SIPP',
    label: 'Self-Invested Personal Pension',
    description: 'Take control of your pension investments.',
    badge: 'Declaration required · COBS 19',
    badgeColor: 'bg-blue-100 text-blue-700',
    steps: 'Personal Details → KYC → Suitability → Disclosure → Pension Declaration → Account',
  },
  {
    code: 'OPTIONS',
    label: 'Options & Derivatives',
    description: 'Trade options on equities, indices, and commodities.',
    badge: 'Appropriateness test · COBS 10.2',
    badgeColor: 'bg-amber-100 text-amber-700',
    steps: 'Personal Details → KYC → Suitability → Disclosure → Account',
  },
];

export default function ProductSelector({ onSelect }: { onSelect: (code: string) => void }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Select a product</h2>
        <p className="text-sm text-gray-500 mt-1">Choose the account type you want to open. Your journey steps depend on the product.</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {PRODUCTS.map(p => (
          <button
            key={p.code}
            onClick={() => onSelect(p.code)}
            className="text-left border rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">{p.code}</span>
                  <span className="font-medium text-gray-900 text-sm">{p.label}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{p.description}</p>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${p.badgeColor}`}>{p.badge}</span>
                <p className="text-xs text-gray-400 mt-2">{p.steps}</p>
              </div>
              <span className="text-gray-300 group-hover:text-blue-500 text-lg mt-1">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
