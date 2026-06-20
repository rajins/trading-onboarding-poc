import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const MCP_SERVERS_BASE = process.env.MCP_SERVERS_PATH || path.resolve(process.cwd(), '../../mcp-servers');
const RULES_PATH = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');
const AUDIT_DB_PATH = process.env.AUDIT_DB_PATH || './audit.db';

const clients = new Map<string, Client>();
const allTools: McpTool[] = [];

async function connectServer(name: string, serverPath: string) {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', path.join(serverPath, 'src', 'index.ts')],
    env: {
      ...process.env,
      RULES_PATH,
      AUDIT_DB_PATH,
    },
  });
  const client = new Client({ name: 'orchestrator', version: '1.0.0' });
  await client.connect(transport);
  clients.set(name, client);

  const { tools } = await client.listTools();
  for (const t of tools) {
    allTools.push({ name: t.name, description: t.description || '', inputSchema: t.inputSchema as Record<string, unknown> });
  }
  console.log(`[MCP] Connected: ${name} (${tools.length} tools)`);
}

export async function initMcpServers() {
  await Promise.all([
    connectServer('audit', path.join(MCP_SERVERS_BASE, 'audit-server')),
    connectServer('eligibility', path.join(MCP_SERVERS_BASE, 'product-eligibility-server')),
    connectServer('kyc', path.join(MCP_SERVERS_BASE, 'kyc-server')),
    connectServer('suitability', path.join(MCP_SERVERS_BASE, 'suitability-server')),
    connectServer('disclosure', path.join(MCP_SERVERS_BASE, 'disclosure-server')),
  ]);
  console.log(`[MCP] All servers connected. Tools: ${allTools.map(t => t.name).join(', ')}`);
}

export function getAnthropicTools() {
  return allTools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as { type: 'object'; properties?: Record<string, unknown> },
  }));
}

export async function callTool(toolName: string, input: unknown): Promise<unknown> {
  for (const client of clients.values()) {
    try {
      const result = await client.callTool({ name: toolName, arguments: input as Record<string, unknown> });
      const text = result.content.find((c: { type: string }) => c.type === 'text') as { text: string } | undefined;
      return text ? JSON.parse(text.text) : result;
    } catch {
      continue;
    }
  }
  throw new Error(`No MCP server handles tool: ${toolName}`);
}
