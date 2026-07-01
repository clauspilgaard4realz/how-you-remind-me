import {
  COLLECTIONS,
  singleOccurrenceId,
  type OccurrenceSlot,
  type RecurringTaskTemplate,
  type TaskOccurrence,
} from '@hyrm/shared';
import { computeInitialNextReminderAt, nagToReminderPhase } from '@hyrm/shared';

export function buildOccurrenceDocument(
  template: RecurringTaskTemplate,
  slot: OccurrenceSlot,
  now: string
): TaskOccurrence {
  const phase = nagToReminderPhase(template.nag);
  const nextReminderAt = computeInitialNextReminderAt(slot.scheduledAt, template.nag, now);

  return {
    id: singleOccurrenceId(template.id, slot.localDate, slot.localTime),
    ownerId: template.ownerId,
    templateId: template.id,
    templateRevision: template.revision,
    scheduledAt: slot.scheduledAt,
    scheduledLocalDate: slot.localDate,
    scheduledLocalTime: slot.localTime,
    status: 'open',
    nextReminderAt: nextReminderAt ?? undefined,
    currentPhaseId: phase.id,
    scheduleSnapshot: { schedule: template.schedule },
    reminderPlanSnapshot: { nag: template.nag, phases: [phase] },
    createdAt: now,
    updatedAt: now,
  };
}
