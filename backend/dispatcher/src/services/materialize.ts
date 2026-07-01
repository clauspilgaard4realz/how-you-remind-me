import { DateTime } from 'luxon';
import {
  COLLECTIONS,
  enumerateOccurrenceSlots,
  rollingWindowEndLocal,
  TIMEZONE,
  type RecurringTaskTemplate,
  type TaskOccurrence,
  type TaskTemplate,
} from '@hyrm/shared';
import { getDb } from '../lib/firebase.js';
import { buildOccurrenceDocument } from './occurrence-builder.js';

function isSchedulableTemplate(template: TaskTemplate): template is RecurringTaskTemplate {
  return template.type === 'recurring' && Boolean(template.schedule);
}

export async function materializeTemplate(
  template: RecurringTaskTemplate
): Promise<TaskOccurrence[]> {
  const db = getDb();
  const now = new Date().toISOString();
  const today = DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd');
  const windowEnd = rollingWindowEndLocal();
  const slots = enumerateOccurrenceSlots(template.schedule, today, windowEnd);
  const created: TaskOccurrence[] = [];

  for (const slot of slots) {
    const occurrence = buildOccurrenceDocument(template, slot, now);
    const ref = db.collection(COLLECTIONS.taskOccurrences).doc(occurrence.id);
    const existing = await ref.get();
    if (existing.exists) {
      const data = existing.data() as TaskOccurrence;
      if (!data.templateTitle && template.title) {
        await ref.update({ templateTitle: template.title, updatedAt: now });
      }
      continue;
    }
    await ref.set(occurrence);
    created.push(occurrence);
  }

  return created;
}

export async function materializeActiveTemplates(): Promise<number> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.taskTemplates).where('active', '==', true).get();
  let created = 0;

  for (const doc of snap.docs) {
    const template = doc.data() as TaskTemplate;
    if (!isSchedulableTemplate(template)) continue;
    const occurrences = await materializeTemplate(template);
    created += occurrences.length;
  }

  return created;
}
