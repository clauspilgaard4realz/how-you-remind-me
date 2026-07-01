import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const keyPath = process.argv[2] ?? 'backend/api/sa-key.json';
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

const uid = 'xIRco7nxWQXaa4bIDlRGEG6A3Xa2';

const health = (await db.doc('system/dispatch_health').get()).data();
console.log('DISPATCH_HEALTH', JSON.stringify(health, null, 2));

const occ = await db.collection('task_occurrences').where('ownerId', '==', uid).get();
for (const doc of occ.docs) {
  const d = doc.data();
  console.log('OCCURRENCE', {
    id: doc.id,
    status: d.status,
    nextReminderAt: d.nextReminderAt,
    scheduledAt: d.scheduledAt,
    templateId: d.templateId,
  });
}

const devices = await db.collection('users').doc(uid).collection('push_devices').get();
for (const doc of devices.docs) {
  const d = doc.data();
  console.log('PUSH_DEVICE', {
    id: doc.id,
    active: d.active,
    lastProviderAcceptedAt: d.lastProviderAcceptedAt,
    failureCount: d.failureCount,
  });
}

const attempts = await db.collection('notification_attempts').limit(10).get();
for (const doc of attempts.docs) {
  const d = doc.data();
  console.log('ATTEMPT', {
    id: doc.id,
    status: d.status,
    lastError: d.lastError,
    scheduledSlotAt: d.scheduledSlotAt,
    occurrenceId: d.occurrenceId,
  });
}
