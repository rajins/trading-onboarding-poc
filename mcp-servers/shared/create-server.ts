import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ZodRawShape, ZodObject } from 'zod';

export type McpTool = {
  description: string;
  inputSchema: ZodObject<ZodRawShape>;
  handler: (input: never) => unknown | Promise<unknown>;
};

export async function createMcpServer(
  name: string,
  tools: Record<string, McpTool>,
  init?: () => Promise<void>
): Promise<void> {
  if (init) await init();
  const server = new McpServer({ name, version: '1.0.0' });
  for (const [toolName, tool] of Object.entries(tools)) {
    server.tool(toolName, tool.description, tool.inputSchema.shape, async (input: unknown) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(await tool.handler(input as never)) }],
    }));
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${name} MCP server running on stdio`);
}
