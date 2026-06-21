import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { personalDetailsTools } from './tools.js';

const server = new McpServer({ name: 'personal-details-server', version: '1.0.0' });

for (const [name, tool] of Object.entries(personalDetailsTools)) {
  server.tool(name, tool.description, tool.inputSchema.shape, (input: unknown) => {
    const result = tool.handler(input as never);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Personal details MCP server running on stdio');
