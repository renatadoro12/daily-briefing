import { runBriefing } from './briefing-core.mjs';

// Disparado pelo GitHub Actions às 22:00 BRT
export default async function (req) {
  const secret = process.env.TRIGGER_SECRET;
  if (secret) {
    const auth = (req?.headers?.get?.('x-trigger-secret')) || '';
    if (auth !== secret) return new Response('Unauthorized', { status: 401 });
  }
  await runBriefing();
  return new Response('OK');
}
