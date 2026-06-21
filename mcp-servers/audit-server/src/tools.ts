import { z } from 'zod';
import { writeAuditEvent, getAuditTrail } from './db.js';

const writeEventSchema = z.object({
  session_id: z.string().describe('Unique session identifier'),
  customer_id: z.string().optional().describe('Customer identifier if known'),
  event_type: z.enum([
    'JOURNEY_STARTED', 'PRODUCT_SELECTED', 'KYC_INITIATED', 'KYC_COMPLETED',
    'SUITABILITY_INITIATED', 'SUITABILITY_COMPLETED', 'DISCLOSURE_PRESENTED',
    'DISCLOSURE_ACKNOWLEDGED', 'JOURNEY_COMPLETED', 'JOURNEY_ABANDONED', 'RULE_EVALUATED',
    'PERSONAL_DETAILS_COMPLETED', 'PERSONAL_DETAILS_VALIDATION_FAILED', 'PEP_FLAGGED', 'FATCA_FLAGGED',
  ]),
  tool_name: z.string().optional().describe('MCP tool that produced this event'),
  input_snapshot: z.record(z.unknown()).optional().describe('Input data at decision time'),
  output_snapshot: z.record(z.unknown()).optional().describe('Output/decision data'),
  decision: z.enum(['PASS', 'FAIL', 'PENDING', 'SKIPPED']).optional(),
  rule_version: z.string().optional().describe('Version of rules file evaluated'),
});

const snapshotSchema = z.object({
  session_id: z.string(),
  customer_id: z.string().optional(),
  tool_name: z.string(),
  input_snapshot: z.record(z.unknown()),
  output_snapshot: z.record(z.unknown()),
  decision: z.enum(['PASS', 'FAIL', 'PENDING', 'SKIPPED']),
  rule_version: z.string(),
});

export const auditTools = {
  write_audit_event: {
    description: 'Write an immutable audit event. Call after every compliance decision.',
    inputSchema: writeEventSchema,
    handler: async (input: z.infer<typeof writeEventSchema>) => {
      const id = await writeAuditEvent(input);
      return { success: true, audit_id: id };
    },
  },

  get_audit_trail: {
    description: 'Retrieve full audit trail for a session.',
    inputSchema: z.object({ session_id: z.string() }),
    handler: async (input: { session_id: string }) => {
      const events = await getAuditTrail(input.session_id);
      return { events, count: events.length };
    },
  },

  snapshot_decision: {
    description: 'Write a compliance decision snapshot — input data, rule evaluated, outcome.',
    inputSchema: snapshotSchema,
    handler: async (input: z.infer<typeof snapshotSchema>) => {
      const id = await writeAuditEvent({ ...input, event_type: 'RULE_EVALUATED' });
      return { success: true, audit_id: id, decision: input.decision };
    },
  },
};
