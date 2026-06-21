import { createMcpServer } from 'mcp-shared/create-server';
import { suitabilityTools } from './tools.js';

await createMcpServer('suitability-server', suitabilityTools as never);
