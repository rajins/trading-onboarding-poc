import { createMcpServer } from 'mcp-shared/create-server';
import { kycTools } from './tools.js';

await createMcpServer('kyc-server', kycTools as never);
