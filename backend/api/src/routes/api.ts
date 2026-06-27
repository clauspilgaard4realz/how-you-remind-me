import { Router } from 'express';
import { validateCreateSingleTask } from '@hyrm/shared';
import { requireAuth } from '../middleware/auth.js';
import { completeOccurrence, createSingleTask, registerPushDevice } from '../services/tasks.js';

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
