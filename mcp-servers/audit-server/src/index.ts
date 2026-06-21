import { createMcpServer } from 'mcp-shared/create-server';
import { auditTools } from './tools.js';
import { initDb } from './db.js';

await createMcpServer('audit-server', auditTools as never, initDb);
