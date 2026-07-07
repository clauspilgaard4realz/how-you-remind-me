import { FieldValue } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import {
  COLLECTIONS,
  TIMEZONE,
  canIgnoreDeadlineOccurrence,
  isDeadlineSchedule,
  nagToReminderPhase,
  singleOccurrenceId,
  type CreateSingleTaskRequest,
  type CreateTaskRequest,
  type RecurringTaskTemplate,
  type SingleTaskTemplate,
  type TaskOccurrence,
  type TaskSchedule,
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
    templateTitle: body.title.trim(),
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

function resolveOccurrenceSchedule(
  occurrence: TaskOccurrence,
  template?: RecurringTaskTemplate
): TaskSchedule | null {
  const snapshot = occurrence.scheduleSnapshot as { schedule?: TaskSchedule } | undefined;
  if (snapshot?.schedule) return snapshot.schedule;
  return template?.schedule ?? null;
}

async function completeDeadlineSeries(
  ownerId: string,
  templateId: string,
  completedOccurrenceId: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const templateRef = db.collection(COLLECTIONS.taskTemplates).doc(templateId);
  await templateRef.update({ active: false, updatedAt: now });

  const openOccurrences = await db
    .collection(COLLECTIONS.taskOccurrences)
    .where('templateId', '==', templateId)
    .where('status', 'in', ['open', 'snoozed', 'overdue'])
    .get();

  const batch = db.batch();
  for (const doc of openOccurrences.docs) {
    const isCompleted = doc.id === completedOccurrenceId;
    batch.update(doc.ref, {
      status: isCompleted ? 'completed' : 'cancelled',
      ...(isCompleted ? { completedAt: now } : {}),
      nextReminderAt: FieldValue.delete(),
      updatedAt: now,
    });
  }
  await batch.commit();
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

  const templateSnap = await db.collection(COLLECTIONS.taskTemplates).doc(data.templateId).get();
  if (templateSnap.exists) {
    const template = templateSnap.data() as RecurringTaskTemplate;
    const schedule = resolveOccurrenceSchedule(data, template);
    if (template.type === 'recurring' && schedule && isDeadlineSchedule(schedule)) {
      await completeDeadlineSeries(ownerId, data.templateId, occurrenceId);
      return;
    }
  }

  const now = new Date().toISOString();
  await ref.update({
    status: 'completed',
    completedAt: now,
    nextReminderAt: FieldValue.delete(),
    updatedAt: now,
  });
}

export async function ignoreOccurrence(ownerId: string, occurrenceId: string): Promise<void> {
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
  if (data.status === 'ignored' || data.status === 'completed') return;

  const templateSnap = await db.collection(COLLECTIONS.taskTemplates).doc(data.templateId).get();
  const template = templateSnap.exists
    ? (templateSnap.data() as RecurringTaskTemplate)
    : undefined;
  const schedule = resolveOccurrenceSchedule(data, template);
  if (!schedule || !canIgnoreDeadlineOccurrence(schedule, data.scheduledLocalDate)) {
    throw new Error('Cannot ignore this occurrence');
  }

  const now = new Date().toISOString();
  await ref.update({
    status: 'ignored',
    ignoredAt: now,
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

export async function updateTask(
  ownerId: string,
  templateId: string,
  body: CreateTaskRequest
): Promise<{ template: RecurringTaskTemplate }> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.taskTemplates).doc(templateId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Task not found');
  }
  const existing = snap.data() as RecurringTaskTemplate;
  if (existing.ownerId !== ownerId) {
    throw new Error('Forbidden');
  }
  if (existing.type !== 'recurring') {
    throw new Error('Only recurring tasks can be updated');
  }

  const now = new Date().toISOString();
  const phase = nagToReminderPhase(body.nag);
  const updated: RecurringTaskTemplate = {
    ...existing,
    title: body.title.trim(),
    description: body.description?.trim(),
    schedule: body.schedule,
    nag: body.nag,
    reminderPhases: [phase],
    group: body.group,
    priority: body.priority ?? existing.priority,
    revision: existing.revision + 1,
    updatedAt: now,
  };

  await ref.set(updated);

  const openOccurrences = await db
    .collection(COLLECTIONS.taskOccurrences)
    .where('templateId', '==', templateId)
    .where('status', 'in', ['open', 'snoozed', 'overdue'])
    .get();

  const batch = db.batch();
  for (const doc of openOccurrences.docs) {
    batch.update(doc.ref, {
      templateTitle: updated.title,
      templateRevision: updated.revision,
      updatedAt: now,
    });
  }
  await batch.commit();
  await materializeTemplate(updated);

  return { template: updated };
}

export async function updateOccurrenceInstance(
  ownerId: string,
  occurrenceId: string,
  body: CreateTaskRequest
): Promise<void> {
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

  const now = new Date().toISOString();
  await ref.update({
    templateTitle: body.title.trim(),
    scheduleSnapshot: { schedule: body.schedule, overrides: true },
    reminderPlanSnapshot: { nag: body.nag, overrides: true },
    updatedAt: now,
  });
}

export async function deleteTaskSeries(ownerId: string, templateId: string): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.taskTemplates).doc(templateId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Task not found');
  }
  const template = snap.data() as RecurringTaskTemplate | SingleTaskTemplate;
  if (template.ownerId !== ownerId) {
    throw new Error('Forbidden');
  }

  const now = new Date().toISOString();
  await ref.update({ active: false, updatedAt: now });

  const openOccurrences = await db
    .collection(COLLECTIONS.taskOccurrences)
    .where('templateId', '==', templateId)
    .where('status', 'in', ['open', 'snoozed', 'overdue'])
    .get();

  const batch = db.batch();
  for (const doc of openOccurrences.docs) {
    batch.update(doc.ref, {
      status: 'cancelled',
      nextReminderAt: FieldValue.delete(),
      updatedAt: now,
    });
  }
  await batch.commit();
}

export async function deleteOccurrence(ownerId: string, occurrenceId: string): Promise<void> {
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

  const now = new Date().toISOString();
  await ref.update({
    status: 'cancelled',
    nextReminderAt: FieldValue.delete(),
    updatedAt: now,
  });
}
