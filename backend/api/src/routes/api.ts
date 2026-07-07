import { Router } from 'express';
import {
  COLLECTIONS,
  validateCreateSingleTask,
  validateCreateTask,
  validateSnoozeOccurrence,
  type SnoozeOccurrenceRequest,
  type TaskOccurrence,
} from '@hyrm/shared';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../lib/firebase.js';
import { resolveSnoozeWakeAt } from '../lib/snooze.js';
import {
  completeOccurrence,
  createSingleTask,
  createTask,
  deleteOccurrence,
  deleteTaskSeries,
  ignoreOccurrence,
  registerPushDevice,
  snoozeOccurrence,
  updateOccurrenceInstance,
  updateTask,
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

apiRouter.put('/tasks/:id', async (req, res) => {
  const validationError = validateCreateTask(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const result = await updateTask(req.user!.uid, req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    const status =
      message === 'Task not found' ? 404 : message === 'Forbidden' ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

apiRouter.delete('/tasks/:id', async (req, res) => {
  try {
    await deleteTaskSeries(req.user!.uid, req.params.id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    const status =
      message === 'Task not found' ? 404 : message === 'Forbidden' ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

apiRouter.put('/occurrences/:id', async (req, res) => {
  const validationError = validateCreateTask(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    await updateOccurrenceInstance(req.user!.uid, req.params.id, req.body);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    const status =
      message === 'Occurrence not found'
        ? 404
        : message === 'Forbidden'
          ? 403
          : 500;
    res.status(status).json({ error: message });
  }
});

apiRouter.delete('/occurrences/:id', async (req, res) => {
  try {
    await deleteOccurrence(req.user!.uid, req.params.id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    const status =
      message === 'Occurrence not found'
        ? 404
        : message === 'Forbidden'
          ? 403
          : 500;
    res.status(status).json({ error: message });
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

apiRouter.post('/occurrences/:id/ignore', async (req, res) => {
  try {
    await ignoreOccurrence(req.user!.uid, req.params.id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ignore failed';
    const status =
      message === 'Occurrence not found'
        ? 404
        : message === 'Forbidden'
          ? 403
          : message === 'Cannot ignore this occurrence'
            ? 409
            : 500;
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
    const body = { ...(req.body ?? {}) } as SnoozeOccurrenceRequest;
    if (body.preset === 'tomorrow' && !body.scheduledLocalTime) {
      const snap = await getDb()
        .collection(COLLECTIONS.taskOccurrences)
        .doc(req.params.id)
        .get();
      if (!snap.exists) {
        res.status(404).json({ error: 'Occurrence not found' });
        return;
      }
      const occurrence = snap.data() as TaskOccurrence;
      if (occurrence.ownerId !== req.user!.uid) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      body.scheduledLocalTime = occurrence.scheduledLocalTime;
    }

    const snoozedUntil = resolveSnoozeWakeAt(body);
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
