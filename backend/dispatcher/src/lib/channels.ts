import type { ReminderPhase, TaskTemplate } from '@hyrm/shared';
import { isEmailConfigured } from '../services/email.js';

export type NotificationChannel = 'push' | 'email';

export function resolvePhase(
  template: TaskTemplate,
  phaseId: string
): ReminderPhase | undefined {
  return template.reminderPhases.find((phase) => phase.id === phaseId) ?? template.reminderPhases[0];
}

/** PoC: email sendes altid når SMTP er konfigureret, også for ældre tasks med kun push. */
export function effectiveChannels(template: TaskTemplate, phaseId: string): Set<NotificationChannel> {
  const phase = resolvePhase(template, phaseId);
  const channels = new Set<NotificationChannel>(phase?.channels ?? ['push']);
  if (isEmailConfigured()) {
    channels.add('email');
  }
  return channels;
}
