// Dev-entry: w trybie deweloperskim klienta serwuje Vite (proxy na /ws, /hooks...).
// npm distribution uses src/cli.ts (with webRoot). Do NOT pass webRoot here.
import { SERVER_PORT } from '@agent-citadel/shared';
import { startServer } from './server.js';

// Safety net: a single unhandled error must not shut down the visualization
// server, which would leave the client without a data source. Log and keep going.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection — server keeps running:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception — server keeps running:', err);
});

import { parseArgs } from './cli-args.js';
const cliOpts = parseArgs(process.argv.slice(2));
const server = await startServer({
  port: cliOpts.port,
  host: process.env.AOA_HOST ?? '127.0.0.1',
  demo: cliOpts.demo,
});
console.log(`Age of Agents server (dev): ${server.url} (ws: /ws)`);
if (cliOpts.demo) console.log('Demo mode: scenario generator started');
