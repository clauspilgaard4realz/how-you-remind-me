import { Router } from 'express';
import { validateCreateSingleTask, validateCreateTask, validateSnoozeOccurrence } from '@hyrm/shared';
import { requireAuth } from '../middleware/auth.js';
import { resolveSnoozeWakeAt } from '../lib/snooze.js';
import {
  completeOccurrence,
  createSingleTask,
  createTask,
  registerPushDevice,
  snoozeOccurrence,
} from '../services/tasks.js';

export const apiRouter = Router();

apiRouter.use(requireAuth);

apiRouter.post('/tasks/single', async (req, res) => {
  const validationError = validateCreateSingleTask(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const result = await createSingleTask(req.user!.uid, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Create failed' });
  }
});

apiRouter.post('/tasks', async (req, res) => {
  const validationError = validateCreateTask(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const result = await createTask(req.user!.uid, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Create failed' });
  }
});

apiRouter.post('/occurrences/:id/complete', async (req, res) => {
  try {
    await completeOccurrence(req.user!.uid, req.params.id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Complete failed';
    const status = message === 'Occurrence not found' ? 404 : message === 'Forbidden' ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

apiRouter.post('/occurrences/:id/snooze', async (req, res) => {
  const validationError = validateSnoozeOccurrence(req.body ?? {});
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const snoozedUntil = resolveSnoozeWakeAt(req.body);
    const result = await snoozeOccurrence(req.user!.uid, req.params.id, snoozedUntil);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Snooze failed';
    const status =
      message === 'Occurrence not found'
        ? 404
        : message === 'Forbidden'
          ? 403
          : message === 'Occurrence is already completed'
            ? 409
            : message.includes('future')
              ? 400
              : 500;
    res.status(status).json({ error: message });
  }
});

apiRouter.post('/push-devices', async (req, res) => {
  const { endpoint, keys, userAgent, platform } = req.body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Invalid push subscription payload' });
    return;
  }

  try {
    const result = await registerPushDevice(req.user!.uid, {
      endpoint,
      keys,
      userAgent,
      platform,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Register failed' });
  }
});
