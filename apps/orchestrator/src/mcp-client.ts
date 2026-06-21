import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type Anthropic from '@anthropic-ai/sdk';
import path from 'path';

const MCP_SERVERS_BASE = process.env.MCP_SERVERS_PATH || path.resolve(process.cwd(), '../../mcp-servers');
const RULES_PATH = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');

const toolToClient = new Map<string, Client>();
const allTools: Anthropic.Tool[] = [];

async function connectServer(name: string, serverPath: string) {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', path.join(serverPath, 'src', 'index.ts')],
    env: { ...process.env, RULES_PATH },
  });
  const client = new Client({ name: 'orchestrator', version: '1.0.0' });
  await client.connect(transport);

  const { tools } = await client.listTools();
  for (const t of tools) {
    toolToClient.set(t.name, client);
    allTools.push({
      name: t.name,
      description: t.description || '',
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    });
  }
  console.log(`[MCP] Connected: ${name} (${tools.length} tools)`);
}

export async function initMcpServers() {
  await Promise.all([
    connectServer('audit',            path.join(MCP_SERVERS_BASE, 'audit-server')),
    connectServer('eligibility',      path.join(MCP_SERVERS_BASE, 'product-eligibility-server')),
    connectServer('personal-details', path.join(MCP_SERVERS_BASE, 'personal-details-server')),
    connectServer('kyc',              path.join(MCP_SERVERS_BASE, 'kyc-server')),
    connectServer('suitability',      path.join(MCP_SERVERS_BASE, 'suitability-server')),
    connectServer('disclosure',       path.join(MCP_SERVERS_BASE, 'disclosure-server')),
  ]);
  console.log(`[MCP] All servers connected. Tools: ${allTools.map(t => t.name).join(', ')}`);
}

export function getAnthropicTools(): Anthropic.Tool[] {
  return allTools;
}

export async function callTool(toolName: string, input: unknown): Promise<unknown> {
  const client = toolToClient.get(toolName);
  if (!client) throw new Error(`No MCP server handles tool: ${toolName}`);
  const result = await client.callTool({ name: toolName, arguments: input as Record<string, unknown> });
  const content = (result.content ?? []) as { type: string; text?: string }[];
  const textBlock = content.find(c => c.type === 'text');
  return textBlock ? JSON.parse((textBlock as { text: string }).text) : result;
}
