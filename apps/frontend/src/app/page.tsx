'use client';
import { useState, useEffect, useCallback } from 'react';
import ProductSelector from '@/components/ProductSelector';
import PersonalDetailsForm from '@/components/PersonalDetailsForm';
import ChatInterface from '@/components/ChatInterface';
import AuditPanel from '@/components/AuditPanel';

type Step = 'product' | 'details' | 'chat';

const STEP_LABELS: Record<Step, string> = {
  product: 'Product',
  details: 'Personal Details',
  chat: 'Onboarding',
};

export default function Home() {
  const [sessionId, setSessionId] = useState('');
  const [step, setStep] = useState<Step>('product');
  const [productCode, setProductCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => { setSessionId(`session-${Date.now()}`); }, []);

  const handleProductSelect = useCallback((code: string) => {
    setProductCode(code);
    setStep('details');
  }, []);

  const handleDetailsSubmit = useCallback(async (fields: Record<string, unknown>) => {
    setSubmitting(true);
    // Format as a message Claude can parse and call save_personal_details with
    const message = `I want to open a ${productCode} account. Here are my personal details:\n${JSON.stringify(fields, null, 2)}`;
    setInitialMessage(message);
    setStep('chat');
    setSubmitting(false);
  }, [productCode]);

  const steps: Step[] = ['product', 'details', 'chat'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">UK Trading Account Onboarding</h1>
            <p className="text-xs text-gray-400">Demo POC · Claude + MCP · FCA-compliant audit trail</p>
          </div>
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  s === step ? 'bg-blue-600 text-white' :
                  steps.indexOf(step) > i ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  <span>{steps.indexOf(step) > i ? '✓' : i + 1}</span>
                  <span>{STEP_LABELS[s]}</span>
                  {s === 'product' && productCode && step !== 'product' && (
                    <span className="font-mono font-bold">{productCode}</span>
                  )}
                </div>
                {i < steps.length - 1 && <span className="text-gray-300 text-xs">›</span>}
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-300 font-mono hidden sm:block">{sessionId.slice(0, 20)}</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full flex gap-4 p-4" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="flex-1 bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          {step === 'product' && (
            <ProductSelector onSelect={handleProductSelect} />
          )}
          {step === 'details' && (
            <PersonalDetailsForm
              productCode={productCode}
              onSubmit={handleDetailsSubmit}
              submitting={submitting}
            />
          )}
          {step === 'chat' && (
            <ChatInterface
              sessionId={sessionId}
              productCode={productCode}
              initialMessage={initialMessage}
            />
          )}
        </div>
        <div className="w-72 bg-white rounded-2xl border shadow-sm p-4 flex flex-col">
          <AuditPanel sessionId={sessionId} />
        </div>
      </main>
    </div>
  );
}
