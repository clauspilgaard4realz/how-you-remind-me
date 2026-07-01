import { FieldValue } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import {
  COLLECTIONS,
  TIMEZONE,
  nagToReminderPhase,
  singleOccurrenceId,
  type CreateSingleTaskRequest,
  type CreateTaskRequest,
  type RecurringTaskTemplate,
  type SingleTaskTemplate,
  type TaskOccurrence,
} from '@hyrm/shared';
import { getDb } from '../lib/firebase.js';
import { materializeTemplate } from './materialize.js';

function toLocalParts(iso: string): { date: string; time: string } {
  const dt = DateTime.fromISO(iso, { zone: 'utc' }).setZone(TIMEZONE);
  return {
    date: dt.toFormat('yyyy-MM-dd'),
    time: dt.toFormat('HH:mm'),
  };
}

export async function createSingleTask(
  ownerId: string,
  body: CreateSingleTaskRequest
): Promise<{ template: SingleTaskTemplate; occurrence: TaskOccurrence }> {
  const db = getDb();
  const now = new Date().toISOString();
  const templateId = uuidv4();
  const local = toLocalParts(body.reminderStartsAt);

  const template: SingleTaskTemplate = {
    id: templateId,
    ownerId,
    title: body.title.trim(),
    description: body.description?.trim(),
    type: 'single',
    active: true,
    timezone: TIMEZONE,
    reminderStartsAt: body.reminderStartsAt,
    deadlineAt: body.deadlineAt,
    reminderPhases: body.reminderPhases,
    group: body.group,
    priority: body.priority ?? 'normal',
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };

  const occurrenceId = singleOccurrenceId(templateId, local.date, local.time);
  const occurrence: TaskOccurrence = {
    id: occurrenceId,
    ownerId,
    templateId,
    templateRevision: 1,
    scheduledAt: body.reminderStartsAt,
    scheduledLocalDate: local.date,
    scheduledLocalTime: local.time,
    status: 'open',
    nextReminderAt: body.reminderStartsAt,
    currentPhaseId: body.reminderPhases[0]?.id,
    scheduleSnapshot: { type: 'single', reminderStartsAt: body.reminderStartsAt },
    reminderPlanSnapshot: { phases: body.reminderPhases },
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(db.collection(COLLECTIONS.taskTemplates).doc(templateId), template);
  batch.set(db.collection(COLLECTIONS.taskOccurrences).doc(occurrenceId), occurrence);
  await batch.commit();

  return { template, occurrence };
}

export async function createTask(
  ownerId: string,
  body: CreateTaskRequest
): Promise<{ template: RecurringTaskTemplate; occurrences: TaskOccurrence[] }> {
  const db = getDb();
  const now = new Date().toISOString();
  const templateId = uuidv4();
  const phase = nagToReminderPhase(body.nag);

  const template: RecurringTaskTemplate = {
    id: templateId,
    ownerId,
    title: body.title.trim(),
    description: body.description?.trim(),
    type: 'recurring',
    active: true,
    timezone: TIMEZONE,
    schedule: body.schedule,
    nag: body.nag,
    reminderPhases: [phase],
    group: body.group,
    priority: body.priority ?? 'normal',
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(COLLECTIONS.taskTemplates).doc(templateId).set(template);
  const occurrences = await materializeTemplate(template);

  return { template, occurrences };
}

export async function completeOccurrence(ownerId: string, occurrenceId: string): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.taskOccurrences).doc(occurrenceId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Occurrence not found');
  }
  const data = snap.data() as TaskOccurrence;
  if (data.ownerId !== ownerId) {
    throw new Error('Forbidden');
  }
  if (data.status === 'completed') return;

  const now = new Date().toISOString();
  await ref.update({
    status: 'completed',
    completedAt: now,
    nextReminderAt: FieldValue.delete(),
    updatedAt: now,
  });
}

export async function registerPushDevice(
  ownerId: string,
  device: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
    platform?: string;
  }
): Promise<{ id: string }> {
  const db = getDb();
  const deviceId = Buffer.from(device.endpoint).toString('base64url').slice(0, 128);
  const now = new Date().toISOString();

  const existingActive = await db
    .collection('users')
    .doc(ownerId)
    .collection('push_devices')
    .where('active', '==', true)
    .get();

  const batch = db.batch();
  for (const doc of existingActive.docs) {
    if (doc.id !== deviceId) {
      batch.set(doc.ref, { active: false, updatedAt: now }, { merge: true });
    }
  }

  batch.set(
    db.collection('users').doc(ownerId).collection('push_devices').doc(deviceId),
    {
      id: deviceId,
      endpoint: device.endpoint,
      keys: device.keys,
      userAgent: device.userAgent ?? '',
      platform: device.platform ?? '',
      createdAt: now,
      lastSeenAt: now,
      failureCount: 0,
      active: true,
    },
    { merge: true }
  );

  await batch.commit();

  return { id: deviceId };
}

export async function snoozeOccurrence(
  ownerId: string,
  occurrenceId: string,
  snoozedUntil: string
): Promise<{ snoozedUntil: string }> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.taskOccurrences).doc(occurrenceId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Occurrence not found');
  }
  const data = snap.data() as TaskOccurrence;
  if (data.ownerId !== ownerId) {
    throw new Error('Forbidden');
  }
  if (data.status === 'completed') {
    throw new Error('Occurrence is already completed');
  }

  const now = new Date().toISOString();
  await ref.update({
    status: 'snoozed',
    snoozedUntil,
    nextReminderAt: snoozedUntil,
    updatedAt: now,
  });

  return { snoozedUntil };
}
