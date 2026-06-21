import { createMcpServer } from 'mcp-shared/create-server';
import { personalDetailsTools } from './tools.js';
import { initStore } from './store.js';

await createMcpServer('personal-details-server', personalDetailsTools as never, initStore);
