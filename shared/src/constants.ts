export const DISPATCH_RESOLUTION_MINUTES = 15;
export const TIMEZONE = 'Europe/Copenhagen';
export const ROLLING_WINDOW_DAYS = 7;

export const COLLECTIONS = {
  taskTemplates: 'task_templates',
  taskOccurrences: 'task_occurrences',
  notificationAttempts: 'notification_attempts',
  dispatchHealth: 'system/dispatch_health',
} as const;

export const QUARTER_MINUTES = [0, 15, 30, 45] as const;

export function isQuarterTime(time: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return false;
  const minutes = Number(match[2]);
  return QUARTER_MINUTES.includes(minutes as (typeof QUARTER_MINUTES)[number]);
}

export function roundToNextQuarter(date: Date): Date {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const remainder = minutes % DISPATCH_RESOLUTION_MINUTES;
  if (remainder !== 0 || d.getSeconds() > 0 || d.getMilliseconds() > 0) {
    d.setMinutes(minutes + (DISPATCH_RESOLUTION_MINUTES - remainder));
    d.setSeconds(0, 0);
  } else {
    d.setSeconds(0, 0);
  }
  return d;
}

export function notificationAttemptId(
  occurrenceId: string,
  scheduledSlotAtIso: string
): string {
  const slotKey = scheduledSlotAtIso.replace(/[:.]/g, '-');
  return `${occurrenceId}_${slotKey}`;
}

export function singleOccurrenceId(templateId: string, localDate: string, localTime: string): string {
  const timeKey = localTime.replace(':', '');
  return `${templateId}_${localDate}_${timeKey}`;
}
