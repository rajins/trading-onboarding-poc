import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { auditTools } from './tools.js';
import { initDb } from './db.js';

await initDb();

const server = new McpServer({ name: 'audit-server', version: '1.0.0' });

type AuditTool = { description: string; inputSchema: z.ZodObject<z.ZodRawShape>; handler: (input: never) => Promise<unknown> };

for (const [name, tool] of Object.entries(auditTools) as [string, AuditTool][]) {
  server.tool(name, tool.description, tool.inputSchema.shape, async (input: unknown) => {
    const result = await tool.handler(input as never);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Audit MCP server running on stdio');
