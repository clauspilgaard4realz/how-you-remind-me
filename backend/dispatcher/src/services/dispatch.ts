import { v4 as uuidv4 } from 'uuid';
import {
  COLLECTIONS,
  DISPATCH_RESOLUTION_MINUTES,
  notificationAttemptId,
  type NotificationAttempt,
  type PushDevice,
  type TaskOccurrence,
  type TaskTemplate,
} from '@hyrm/shared';
import { getDb } from '../lib/firebase.js';
import { addCadenceMinutes, formatSlotIso } from '../lib/slots.js';
import { buildPushPayload, sendPushToDevices } from './push.js';

const LEASE_MS = 60_000;

export async function loadActiveDevices(ownerId: string): Promise<PushDevice[]> {
  const snap = await getDb()
    .collection('users')
    .doc(ownerId)
    .collection('push_devices')
    .where('active', '==', true)
    .get();
  return snap.docs.map((d) => d.data() as PushDevice);
}

export async function deactivateDevice(ownerId: string, deviceId: string): Promise<void> {
  await getDb()
    .collection('users')
    .doc(ownerId)
    .collection('push_devices')
    .doc(deviceId)
    .set({ active: false, updatedAt: new Date().toISOString() }, { merge: true });
}

async function claimAttempt(
  occurrence: TaskOccurrence,
  template: TaskTemplate,
  slot: Date,
  phaseId: string
): Promise<{ claimed: boolean; attempt?: NotificationAttempt; leaseId?: string }> {
  const db = getDb();
  const slotIso = formatSlotIso(slot);
  const attemptId = notificationAttemptId(occurrence.id, slotIso);
  const ref = db.collection(COLLECTIONS.notificationAttempts).doc(attemptId);
  const leaseId = uuidv4();
  const now = new Date().toISOString();
  const leaseExpiresAt = new Date(Date.now() + LEASE_MS).toISOString();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const existing = snap.data() as NotificationAttempt;
      if (existing.status === 'provider_accepted') {
        return { claimed: false };
      }
      if (
        existing.status === 'leased' &&
        existing.leaseExpiresAt &&
        new Date(existing.leaseExpiresAt) > new Date()
      ) {
        return { claimed: false };
      }
    }

    const attempt: NotificationAttempt = {
      id: attemptId,
      occurrenceId: occurrence.id,
      templateId: template.id,
      phaseId,
      scheduledSlotAt: slotIso,
      status: 'leased',
      leaseId,
      leaseExpiresAt,
      attemptCount: (snap.exists ? (snap.data() as NotificationAttempt).attemptCount : 0) + 1,
      createdAt: snap.exists ? (snap.data() as NotificationAttempt).createdAt : now,
      updatedAt: now,
    };

    tx.set(ref, attempt, { merge: true });
    return { claimed: true, attempt, leaseId };
  });
}

async function confirmAttempt(
  attemptId: string,
  leaseId: string,
  update: Partial<NotificationAttempt>
): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.notificationAttempts).doc(attemptId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const current = snap.data() as NotificationAttempt;
    if (current.leaseId !== leaseId) return false;
    tx.set(
      ref,
      {
        ...update,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  });
}

function isDue(occurrence: TaskOccurrence, slotIso: string): boolean {
  if (!['open', 'overdue', 'snoozed'].includes(occurrence.status)) return false;
  if (occurrence.snoozedUntil && new Date(occurrence.snoozedUntil) > new Date(slotIso)) {
    return false;
  }
  if (!occurrence.nextReminderAt) return false;
  return new Date(occurrence.nextReminderAt) <= new Date(slotIso);
}

export async function dispatchDueNotifications(slot: Date): Promise<{
  processed: number;
  sent: number;
  failures: number;
}> {
  const db = getDb();
  const slotIso = formatSlotIso(slot);
  const snap = await db
    .collection(COLLECTIONS.taskOccurrences)
    .where('status', 'in', ['open', 'snoozed', 'overdue'])
    .where('nextReminderAt', '<=', slotIso)
    .limit(50)
    .get();

  let processed = 0;
  let sent = 0;
  let failures = 0;

  for (const doc of snap.docs) {
    const occurrence = doc.data() as TaskOccurrence;
    if (!isDue(occurrence, slotIso)) continue;

    const templateSnap = await db
      .collection(COLLECTIONS.taskTemplates)
      .doc(occurrence.templateId)
      .get();
    if (!templateSnap.exists) continue;
    const template = templateSnap.data() as TaskTemplate;
    if (!template.active) continue;

    const phaseId = occurrence.currentPhaseId ?? template.reminderPhases[0]?.id ?? 'phase-1';
    const claim = await claimAttempt(occurrence, template, slot, phaseId);
    if (!claim.claimed || !claim.attempt || !claim.leaseId) continue;

    processed += 1;
    const devices = await loadActiveDevices(occurrence.ownerId);
    if (devices.length === 0) {
      await confirmAttempt(claim.attempt.id, claim.leaseId, {
        status: 'failed_permanent',
        lastError: 'No active push devices',
      });
      failures += 1;
      continue;
    }

    const payload = buildPushPayload(occurrence, template);
    const results = await sendPushToDevices(devices, payload);
    const anyAccepted = results.some((r) => r.ok);
    const permanentDeviceFailures = results.filter(
      (r) => r.statusCode === 404 || r.statusCode === 410
    );

    for (const failure of permanentDeviceFailures) {
      await deactivateDevice(occurrence.ownerId, failure.deviceId);
    }

    if (anyAccepted) {
      sent += 1;
      await confirmAttempt(claim.attempt.id, claim.leaseId, {
        status: 'provider_accepted',
        providerAcceptedAt: new Date().toISOString(),
      });

      const nextReminderAt = addCadenceMinutes(slotIso, DISPATCH_RESOLUTION_MINUTES);
      await doc.ref.update({
        nextReminderAt,
        updatedAt: new Date().toISOString(),
        status: occurrence.status === 'snoozed' ? 'open' : occurrence.status,
      });

      const now = new Date().toISOString();
      for (const device of devices) {
        const result = results.find((r) => r.deviceId === device.id);
        if (result?.ok) {
          await db
            .collection('users')
            .doc(occurrence.ownerId)
            .collection('push_devices')
            .doc(device.id)
            .set(
              {
                lastProviderAcceptedAt: now,
                lastSeenAt: now,
                failureCount: 0,
              },
              { merge: true }
            );
        } else if (result && !result.ok) {
          await db
            .collection('users')
            .doc(occurrence.ownerId)
            .collection('push_devices')
            .doc(device.id)
            .set(
              {
                failureCount: (device.failureCount ?? 0) + 1,
                lastSeenAt: now,
              },
              { merge: true }
            );
        }
      }
    } else {
      failures += 1;
      const retryable = results.some(
        (r) => r.statusCode === 429 || (r.statusCode !== undefined && r.statusCode >= 500)
      );
      await confirmAttempt(claim.attempt.id, claim.leaseId, {
        status: retryable ? 'retry_scheduled' : 'failed_permanent',
        retryAt: retryable ? addCadenceMinutes(slotIso, DISPATCH_RESOLUTION_MINUTES) : undefined,
        lastError: results.map((r) => r.error).filter(Boolean).join('; ') || 'Push failed',
      });
    }
  }

  return { processed, sent, failures };
}

export async function updateDispatchHealth(
  slot: Date,
  stats: { processed: number; sent: number; failures: number }
): Promise<void> {
  const db = getDb();
  const allowedUid = process.env.ALLOWED_UID;
  let activeDeviceCount = 0;
  let openOccurrencesWithoutDevice = 0;

  if (allowedUid) {
    const devices = await loadActiveDevices(allowedUid);
    activeDeviceCount = devices.length;

    const openSnap = await db
      .collection(COLLECTIONS.taskOccurrences)
      .where('ownerId', '==', allowedUid)
      .where('status', 'in', ['open', 'snoozed', 'overdue'])
      .get();
    openOccurrencesWithoutDevice = activeDeviceCount === 0 ? openSnap.size : 0;
  }

  const now = new Date().toISOString();
  const consecutiveFailures =
    stats.failures > 0 && stats.sent === 0
      ? ((await db.doc(COLLECTIONS.dispatchHealth).get()).data()?.consecutiveFailures ?? 0) + 1
      : 0;

  await db.doc(COLLECTIONS.dispatchHealth).set(
    {
      lastDispatchStartedAt: now,
      lastDispatchCompletedAt: now,
      lastSlotProcessed: formatSlotIso(slot),
      attemptsInLastRun: stats.processed,
      failuresInLastRun: stats.failures,
      activeDeviceCount,
      openOccurrencesWithoutDevice,
      consecutiveFailures,
    },
    { merge: true }
  );
}
