import { createMcpServer } from 'mcp-shared/create-server';
import { eligibilityTools } from './tools.js';

await createMcpServer('product-eligibility-server', eligibilityTools as never);
