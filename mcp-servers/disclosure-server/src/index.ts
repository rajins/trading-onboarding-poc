import { createMcpServer } from 'mcp-shared/create-server';
import { disclosureTools } from './tools.js';

await createMcpServer('disclosure-server', disclosureTools as never);
