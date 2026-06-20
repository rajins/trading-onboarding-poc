'use client';
import { useState } from 'react';

interface AuditEvent {
  id: number;
  event_type: string;
  tool_name?: string;
  decision?: string;
  created_at: string;
}

const decisionStyle: Record<string, string> = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  SKIPPED: 'bg-gray-100 text-gray-600',
};

export default function AuditPanel({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/${sessionId}`);
      const data = await res.json();
      setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Audit Trail</h2>
        <button onClick={refresh} disabled={loading} className="text-xs text-blue-600 hover:underline disabled:opacity-40">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-gray-400 text-center mt-8">No events yet. Start the onboarding, then click Refresh.</p>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {events.map(e => (
            <div key={e.id} className="border rounded-lg p-2.5 text-xs bg-white">
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium text-gray-800 truncate">{e.event_type}</span>
                {e.decision && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 ${decisionStyle[e.decision] || 'bg-gray-100 text-gray-600'}`}>
                    {e.decision}
                  </span>
                )}
              </div>
              {e.tool_name && <div className="text-gray-400 mt-0.5">via {e.tool_name}</div>}
              <div className="text-gray-400">{new Date(e.created_at).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
