import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt.js';
import { initMcpServers, getAnthropicTools, callTool } from './mcp-client.js';
import { getOrCreateSession, updateSession, getAllSessions } from './session.js';

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/chat', async (req, res) => {
  const { session_id, message } = req.body as { session_id: string; message: string };
  const session = getOrCreateSession(session_id);
  session.messages.push({ role: 'user', content: message });

  const tools = getAnthropicTools();
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: session.messages as Anthropic.MessageParam[],
    tools,
  });

  // Agentic loop
  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUses) {
      try {
        const result = await callTool(toolUse.name, toolUse.input);
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
      } catch (err) {
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${err instanceof Error ? err.message : 'Unknown'}`, is_error: true });
      }
    }

    session.messages.push({ role: 'assistant', content: response.content });
    session.messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: session.messages as Anthropic.MessageParam[],
      tools,
    });
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const reply = textBlock?.text ?? '';
  session.messages.push({ role: 'assistant', content: reply });
  updateSession(session_id, { messages: session.messages });

  res.json({ reply, session_id });
});

app.get('/audit/:session_id', async (req, res) => {
  try {
    const result = await callTool('get_audit_trail', { session_id: req.params.session_id });
    res.json(result);
  } catch {
    res.json({ events: [], count: 0 });
  }
});

app.get('/sessions', (_req, res) => {
  const sessions = getAllSessions().map(s => ({
    id: s.id,
    product_code: s.product_code,
    created_at: s.created_at,
    message_count: s.messages.length,
  }));
  res.json({ sessions });
});

const PORT = process.env.ORCHESTRATOR_PORT || 3001;

await initMcpServers();
app.listen(PORT, () => console.log(`Orchestrator running on :${PORT}`));
