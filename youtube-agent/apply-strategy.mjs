import fs from 'node:fs/promises';

const baseUrl = process.env.AGENTTUBE_URL || 'http://127.0.0.1:3456';
const apiKey = process.env.API_KEY || '';
const strategyPath = new URL('./channel-strategy.json', import.meta.url);
const strategy = JSON.parse(await fs.readFile(strategyPath, 'utf8'));

const headers = { 'Content-Type': 'application/json' };
if (apiKey) headers['x-api-key'] = apiKey;

const response = await fetch(`${baseUrl}/api/operator/strategy`, {
  method: 'PUT',
  headers,
  body: JSON.stringify(strategy)
});

const body = await response.text();
if (!response.ok) {
  console.error(`Failed to save strategy: HTTP ${response.status}`);
  console.error(body);
  process.exit(1);
}

console.log('Shakti Millets channel strategy saved as draft.');
console.log(body);
console.log('Review it in AgentTube before choosing “Activate & run now”.');
