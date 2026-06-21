import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '../../.env') });

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt.js';
import { initMcpServers, getAnthropicTools, callTool } from './mcp-client.js';
import { getOrCreateSession, appendAndSave, getAllSessions } from './session.js';
import { initDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

app.post('/chat', async (req, res) => {
  const { session_id, message } = req.body as { session_id: string; message: string };
  try {
    const session = await getOrCreateSession(session_id);

    const tools = getAnthropicTools();
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [...session.messages, { role: 'user', content: message }],
      tools,
    });

    await appendAndSave(session, { role: 'user', content: message });

    while (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

      const toolResults = await Promise.all(
        toolUses.map(async (toolUse): Promise<Anthropic.ToolResultBlockParam> => {
          try {
            const result = await callTool(toolUse.name, toolUse.input);
            return { type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) };
          } catch (err) {
            const msg = toMessage(err);
            return { type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${msg}`, is_error: true };
          }
        })
      );

      await appendAndSave(
        session,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      );

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: session.messages,
        tools,
      });
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    const reply = textBlock?.text ?? '';
    await appendAndSave(session, { role: 'assistant', content: reply });

    res.json({ reply, session_id });
  } catch (err: unknown) {
    const msg = toMessage(err);
    const friendly = msg.includes('credit balance')
      ? 'Anthropic API credits exhausted. Please top up at console.anthropic.com → Plans & Billing.'
      : `Orchestrator error: ${msg}`;
    console.error('[chat error]', msg);
    res.status(500).json({ error: friendly, session_id });
  }
});

app.get('/audit/:session_id', async (req, res) => {
  try {
    const result = await callTool('get_audit_trail', { session_id: req.params.session_id });
    res.json(result);
  } catch (err) {
    const msg = toMessage(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/sessions', async (_req, res) => {
  try {
    const sessions = (await getAllSessions()).map(s => ({
      id: s.id,
      product_code: s.product_code,
      created_at: s.created_at,
      message_count: s.messages.length,
    }));
    res.json({ sessions });
  } catch (err) {
    const msg = toMessage(err);
    res.status(500).json({ error: msg });
  }
});

const PORT = process.env.ORCHESTRATOR_PORT || 3001;

await Promise.all([initDb(), initMcpServers()]);
app.listen(PORT, () => console.log(`Orchestrator running on :${PORT}`));
