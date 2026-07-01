import { DISPATCH_RESOLUTION_MINUTES } from './constants.js';
import type { CreateSingleTaskRequest, CreateTaskRequest, ReminderPhase, TaskTemplate } from './types.js';
import { validateNagConfig, validateTaskSchedule } from './schedule.js';

export function validateReminderPhase(phase: ReminderPhase): string | null {
  const { unit, every } = phase.cadence;
  if (every < 1) return 'Cadence every must be at least 1';
  if (unit === 'minutes') {
    if (every < DISPATCH_RESOLUTION_MINUTES) {
      return `Minimum reminder frequency is ${DISPATCH_RESOLUTION_MINUTES} minutes`;
    }
    if (every % DISPATCH_RESOLUTION_MINUTES !== 0) {
      return `Minute cadence must be a multiple of ${DISPATCH_RESOLUTION_MINUTES}`;
    }
  }
  if (phase.channels.length === 0) return 'At least one channel is required';
  return null;
}

export function validateCreateTask(body: CreateTaskRequest): string | null {
  if (!body.title?.trim()) return 'Title is required';
  const scheduleErr = validateTaskSchedule(body.schedule);
  if (scheduleErr) return scheduleErr;
  const nagErr = validateNagConfig(body.nag);
  if (nagErr) return nagErr;
  return null;
}

export function validateCreateSingleTask(body: CreateSingleTaskRequest): string | null {
  if (!body.title?.trim()) return 'Title is required';
  if (!body.reminderStartsAt) return 'reminderStartsAt is required';
  if (!body.reminderPhases?.length) return 'At least one reminder phase is required';
  for (const phase of body.reminderPhases) {
    const err = validateReminderPhase(phase);
    if (err) return err;
  }
  if (body.deadlineAt && new Date(body.deadlineAt) < new Date(body.reminderStartsAt)) {
    return 'deadlineAt must be after reminderStartsAt';
  }
  return null;
}

export function assertSingleTemplate(template: TaskTemplate): template is import('./types.js').SingleTaskTemplate {
  return template.type === 'single';
}

export function assertRecurringTemplate(
  template: TaskTemplate
): template is import('./types.js').RecurringTaskTemplate {
  return template.type === 'recurring';
}
