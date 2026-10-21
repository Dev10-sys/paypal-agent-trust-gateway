import * as path from 'node:path';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import { buildServer } from './server.js';

// Load .env if present
dotenv.config();

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

// Ensure data directory exists for ledger
const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const ledgerPath = path.join(dataDir, 'gateway-ledger.db');

const app = buildServer({
  ledgerPath,
});

async function start() {
  try {
    await app.listen({ port, host });
    console.log(`\n======================================================`);
    console.log(`🛡️  PayPal Agent Trust Gateway API running at http://${host}:${port}`);
    console.log(`🔒 Mode: PayPal Sandbox Only | Server-Owned Catalog Enforced`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
