import { parseArgs } from 'node:util';

export function runMcpServer(args: string[]) {
  const selectedTools = args.includes('--tools=all') ? ['all'] : ['invoices.get'];
  const env = args.find(a => a.startsWith('--paypal-environment='))?.split('=')[1];
  const sandbox = env?.toLowerCase() != 'production';

  if (selectedTools.includes('all')) {
    console.log("Enabled all PayPal agent toolkit tools!");
  }
}
