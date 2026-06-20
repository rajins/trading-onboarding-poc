'use client';
import { useState, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import AuditPanel from '@/components/AuditPanel';

export default function Home() {
  const [sessionId, setSessionId] = useState('');
  useEffect(() => { setSessionId(`session-${Date.now()}`); }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">UK Trading Account Onboarding</h1>
            <p className="text-xs text-gray-400">Demo POC · Claude + MCP · FCA-compliant audit trail</p>
          </div>
          <span className="text-xs text-gray-300 font-mono hidden sm:block">{sessionId}</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full flex gap-4 p-4" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="flex-1 bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          <ChatInterface sessionId={sessionId} />
        </div>
        <div className="w-64 bg-white rounded-2xl border shadow-sm p-4 flex flex-col">
          <AuditPanel sessionId={sessionId} />
        </div>
      </main>
    </div>
  );
}
