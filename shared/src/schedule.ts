import { DateTime } from 'luxon';
import { DISPATCH_RESOLUTION_MINUTES, ROLLING_WINDOW_DAYS, TIMEZONE, isQuarterTime } from './constants.js';
import { ceilToDispatchSlotIso } from './snooze.js';
import type {
  NagCadence,
  NagConfig,
  RecurrenceKind,
  ScheduleRecurrence,
  TaskSchedule,
  TaskTemplate,
} from './types.js';

export interface OccurrenceSlot {
  localDate: string;
  localTime: string;
  scheduledAt: string;
}

export function localDateTimeToUtcIso(localDate: string, timeOfDay: string): string {
  const dt = DateTime.fromISO(`${localDate}T${timeOfDay}`, { zone: TIMEZONE });
  if (!dt.isValid) {
    throw new Error('Invalid local date/time');
  }
  return dt.toUTC().toISO()!;
}

export function addCadenceMinutes(iso: string, minutes: number): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).plus({ minutes }).toUTC().toISO()!;
}

export function normalizeScheduleRecurrence(recurrence: ScheduleRecurrence): RecurrenceKind {
  return recurrence === 'weekdays' ? 'weekly' : recurrence;
}

export function isWeeklySchedule(schedule: Pick<TaskSchedule, 'recurrence'>): boolean {
  return schedule.recurrence === 'weekly' || schedule.recurrence === 'weekdays';
}

export function isDeadlineSchedule(schedule: Pick<TaskSchedule, 'recurrence'>): boolean {
  return schedule.recurrence === 'deadline';
}

export function isDeadlinePassed(
  schedule: TaskSchedule,
  localDate: string = DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd')
): boolean {
  if (!schedule.deadlineDate) return false;
  return localDate > schedule.deadlineDate;
}

export function canIgnoreDeadlineOccurrence(
  schedule: TaskSchedule,
  occurrenceLocalDate: string
): boolean {
  if (!isDeadlineSchedule(schedule) || !schedule.deadlineDate) return false;
  return occurrenceLocalDate <= schedule.deadlineDate;
}

export function computeEffectiveNag(
  nag: NagConfig,
  schedule: TaskSchedule | null,
  occurrenceLocalDate: string
): NagConfig {
  if (!schedule || !isDeadlineSchedule(schedule) || !schedule.deadlineDate) {
    return nag;
  }
  const today = DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd');
  if (occurrenceLocalDate > schedule.deadlineDate || today > schedule.deadlineDate) {
    return { cadence: '15m' };
  }
  return nag;
}

export function formatDaysOfWeek(days: number[] | undefined): string {
  if (!days?.length) return '';
  return WEEKDAY_OPTIONS.filter((option) => days.includes(option.value))
    .map((option) => option.label)
    .join(', ');
}

function matchesRecurrence(schedule: TaskSchedule, day: DateTime): boolean {
  const weekday = day.weekday;
  const localDateStr = day.toFormat('yyyy-MM-dd');
  switch (schedule.recurrence) {
    case 'once':
    case 'daily':
      return true;
    case 'weekly':
    case 'weekdays':
      return schedule.daysOfWeek?.includes(weekday) ?? false;
    case 'deadline': {
      if (!schedule.deadlineDate) return false;
      if (localDateStr > schedule.deadlineDate) return true;
      if (localDateStr === schedule.deadlineDate) return true;
      return schedule.daysOfWeek?.includes(weekday) ?? false;
    }
    default:
      return false;
  }
}

export function enumerateOccurrenceSlots(
  schedule: TaskSchedule,
  windowStartLocal: string,
  windowEndLocal: string
): OccurrenceSlot[] {
  const startBound = DateTime.fromISO(schedule.startLocalDate, { zone: TIMEZONE }).startOf('day');
  const endBound =
    schedule.recurrence !== 'deadline' && schedule.endLocalDate
      ? DateTime.fromISO(schedule.endLocalDate, { zone: TIMEZONE }).endOf('day')
      : null;

  let cursor = DateTime.fromISO(windowStartLocal, { zone: TIMEZONE }).startOf('day');
  const windowEnd = DateTime.fromISO(windowEndLocal, { zone: TIMEZONE }).endOf('day');
  const slots: OccurrenceSlot[] = [];

  while (cursor <= windowEnd) {
    if (cursor < startBound) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }
    if (endBound && cursor > endBound) break;

    if (schedule.recurrence === 'once') {
      if (cursor.toFormat('yyyy-MM-dd') === schedule.startLocalDate) {
        slots.push({
          localDate: schedule.startLocalDate,
          localTime: schedule.timeOfDay,
          scheduledAt: localDateTimeToUtcIso(schedule.startLocalDate, schedule.timeOfDay),
        });
      }
      break;
    }

    if (matchesRecurrence(schedule, cursor)) {
      const localDate = cursor.toFormat('yyyy-MM-dd');
      slots.push({
        localDate,
        localTime: schedule.timeOfDay,
        scheduledAt: localDateTimeToUtcIso(localDate, schedule.timeOfDay),
      });
    }

    cursor = cursor.plus({ days: 1 });
  }

  return slots;
}

export function rollingWindowEndLocal(from: DateTime = DateTime.now().setZone(TIMEZONE)): string {
  return from.plus({ days: ROLLING_WINDOW_DAYS }).toFormat('yyyy-MM-dd');
}

export function computeInitialNextReminderAt(
  scheduledAt: string,
  nag: NagConfig,
  nowIso: string = new Date().toISOString()
): string | null {
  const nowMs = new Date(nowIso).getTime();
  const scheduledMs = new Date(scheduledAt).getTime();

  if (nag.cadence === 'daily') {
    if (nowMs <= scheduledMs) {
      return ceilToDispatchSlotIso(scheduledAt);
    }
    const sameDay =
      DateTime.fromISO(nowIso, { zone: 'utc' }).setZone(TIMEZONE).toFormat('yyyy-MM-dd') ===
      DateTime.fromISO(scheduledAt, { zone: 'utc' }).setZone(TIMEZONE).toFormat('yyyy-MM-dd');
    if (sameDay) {
      return ceilToDispatchSlotIso(nowIso);
    }
    return null;
  }

  const startMs = Math.max(nowMs, scheduledMs);
  return ceilToDispatchSlotIso(new Date(startMs).toISOString());
}

export function computeNextReminderAfterSlot(
  nag: NagConfig,
  slotIso: string,
  _scheduledAt: string
): string | null {
  switch (nag.cadence) {
    case '15m':
      return addCadenceMinutes(slotIso, DISPATCH_RESOLUTION_MINUTES);
    case '1h':
      return addCadenceMinutes(slotIso, 60);
    case 'daily':
      return null;
    default:
      return addCadenceMinutes(slotIso, DISPATCH_RESOLUTION_MINUTES);
  }
}

export function nagToReminderPhase(nag: NagConfig) {
  const every =
    nag.cadence === '15m' ? DISPATCH_RESOLUTION_MINUTES : nag.cadence === '1h' ? 60 : 24 * 60;
  const unit = nag.cadence === '1h' ? ('hours' as const) : ('minutes' as const);
  return {
    id: 'phase-1',
    anchor: 'occurrence_scheduled_at' as const,
    cadence: { unit, every: nag.cadence === '1h' ? 1 : every },
    channels: ['push' as const],
  };
}

export function resolveTemplateSchedule(template: TaskTemplate): TaskSchedule | null {
  if (template.type === 'recurring' && template.schedule) {
    return template.schedule;
  }
  if (template.type === 'single') {
    const dt = DateTime.fromISO(template.reminderStartsAt, { zone: 'utc' }).setZone(TIMEZONE);
    return {
      recurrence: 'once',
      startLocalDate: dt.toFormat('yyyy-MM-dd'),
      timeOfDay: dt.toFormat('HH:mm'),
      endLocalDate: template.deadlineAt
        ? DateTime.fromISO(template.deadlineAt, { zone: 'utc' }).setZone(TIMEZONE).toFormat('yyyy-MM-dd')
        : undefined,
    };
  }
  return null;
}

export function resolveTemplateNag(template: TaskTemplate): NagConfig {
  if (template.type === 'recurring' && template.nag) {
    return template.nag;
  }
  const phase = template.reminderPhases[0];
  if (phase?.cadence.unit === 'hours') return { cadence: '1h' };
  if (phase?.cadence.unit === 'minutes' && phase.cadence.every >= 60) return { cadence: '1h' };
  if (phase?.cadence.unit === 'days') return { cadence: 'daily' };
  return { cadence: '15m' };
}

export function validateTaskSchedule(schedule: TaskSchedule): string | null {
  if (!schedule.startLocalDate) return 'startLocalDate is required';
  if (!isQuarterTime(schedule.timeOfDay)) return 'timeOfDay must use quarter hours (HH:00, :15, :30, :45)';
  if (schedule.endLocalDate && schedule.endLocalDate < schedule.startLocalDate) {
    return 'endLocalDate must be on or after startLocalDate';
  }

  const kinds: ScheduleRecurrence[] = ['once', 'daily', 'weekly', 'weekdays', 'deadline'];
  if (!kinds.includes(schedule.recurrence)) return 'Invalid recurrence';

  if (isWeeklySchedule(schedule) && !schedule.daysOfWeek?.length) {
    return 'weekly requires at least one weekday';
  }
  if (isDeadlineSchedule(schedule)) {
    if (!schedule.deadlineDate) return 'deadline requires deadlineDate';
    if (schedule.deadlineDate < schedule.startLocalDate) {
      return 'deadlineDate must be on or after startLocalDate';
    }
    if (!schedule.daysOfWeek?.length) return 'deadline requires at least one weekday';
  }
  if ((isWeeklySchedule(schedule) || isDeadlineSchedule(schedule)) && schedule.daysOfWeek) {
    for (const day of schedule.daysOfWeek) {
      if (day < 1 || day > 7) return 'daysOfWeek must be 1-7 (Mon-Sun)';
    }
  }
  return null;
}

export function validateNagConfig(nag: NagConfig): string | null {
  const cadences: NagCadence[] = ['15m', '1h', 'daily'];
  if (!cadences.includes(nag.cadence)) return 'Invalid nag cadence';
  return null;
}

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Man' },
  { value: 2, label: 'Tir' },
  { value: 3, label: 'Ons' },
  { value: 4, label: 'Tor' },
  { value: 5, label: 'Fre' },
  { value: 6, label: 'Lør' },
  { value: 7, label: 'Søn' },
] as const;
