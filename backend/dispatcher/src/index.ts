import express from 'express';
import { dispatchDueNotifications, updateDispatchHealth } from './services/dispatch.js';
import { materializeActiveTemplates } from './services/materialize.js';
import { parseSchedulerSlot } from './lib/slots.js';

const app = express();
const port = Number(process.env.PORT ?? 8080);

function authorizeDispatch(req: express.Request, res: express.Response): boolean {
  const expectedAudience = process.env.DISPATCH_AUDIENCE;
  if (expectedAudience) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing OIDC token' });
      return false;
    }
  }

  const devSecret = process.env.DISPATCH_DEV_SECRET;
  if (devSecret) {
    const provided = req.headers['x-dispatch-secret'];
    if (provided !== devSecret) {
      res.status(401).json({ error: 'Invalid dispatch secret' });
      return false;
    }
  }

  return true;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'reminder-dispatcher' });
});

app.post('/dispatch', express.json(), async (req, res) => {
  if (!authorizeDispatch(req, res)) return;

  const slot = parseSchedulerSlot(req.headers as Record<string, string | string[] | undefined>);
  const started = Date.now();

  try {
    const materialized = await materializeActiveTemplates();
    const stats = await dispatchDueNotifications(slot);
    await updateDispatchHealth(slot, stats);
    res.json({
      ok: true,
      slot: slot.toISOString(),
      durationMs: Date.now() - started,
      materialized,
      ...stats,
    });
  } catch (err) {
    console.error('Dispatch failed', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Dispatch failed' });
  }
});

app.listen(port, () => {
  console.log(`Reminder Dispatcher listening on ${port}`);
});
