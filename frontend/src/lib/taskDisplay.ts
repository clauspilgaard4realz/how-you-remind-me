import type { NagCadence, RecurrenceKind, TaskOccurrence, TaskSchedule, TaskTemplate } from '@hyrm/shared';
import { resolveTemplateNag, resolveTemplateSchedule } from '@hyrm/shared';
import { isSnoozeExpired } from './occurrence';

const TZ = 'Europe/Copenhagen';

export type OccurrenceSection = 'overdue' | 'laterToday' | 'tomorrow' | 'later';

export interface GroupedOccurrences {
  section: OccurrenceSection;
  label: string;
  items: TaskOccurrence[];
  showCount?: boolean;
}

function localDateInTz(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDaysLocal(localDate: string, days: number): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatTodayEyebrow(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TZ,
  }).format(date);
  return formatted.toUpperCase();
}

export function formatTimeShort(isoOrTime: string): string {
  if (/^\d{2}:\d{2}$/.test(isoOrTime)) {
    return isoOrTime.replace(':', '.');
  }
  return new Intl.DateTimeFormat('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  })
    .format(new Date(isoOrTime))
    .replace(':', '.');
}

export function isOverdue(occurrence: TaskOccurrence, now = Date.now()): boolean {
  if (occurrence.status === 'completed' || occurrence.status === 'cancelled') return false;
  if (
    occurrence.status === 'snoozed' &&
    occurrence.snoozedUntil &&
    !isSnoozeExpired(occurrence.snoozedUntil)
  ) {
    return false;
  }
  return new Date(occurrence.scheduledAt).getTime() < now;
}

export function overdueDelayLabel(occurrence: TaskOccurrence, now = Date.now()): string {
  const diffMs = now - new Date(occurrence.scheduledAt).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes} min forsinket`;
  const hours = Math.round(minutes / 60);
  return `${hours} time${hours === 1 ? '' : 'r'} forsinket`;
}

export function nagLabel(cadence: NagCadence): string {
  switch (cadence) {
    case '15m':
      return 'Nagger hvert 15. min';
    case '1h':
      return 'Nagger hver time';
    case 'daily':
      return 'Kun én gang';
    default:
      return 'Nagger';
  }
}

export function nagLabelShort(cadence: NagCadence): string {
  switch (cadence) {
    case '15m':
      return 'Hvert 15. min';
    case '1h':
      return 'Hver time';
    case 'daily':
      return 'Kun én gang';
    default:
      return 'Nag';
  }
}

export function recurrenceLabel(schedule: TaskSchedule | null): string {
  if (!schedule) return 'Én gang';
  switch (schedule.recurrence) {
    case 'once':
      return 'Én gang';
    case 'daily':
      return 'Dagligt';
    case 'weekly':
      return 'Ugentlig';
    case 'weekdays':
      return 'Bestemte ugedage';
    default:
      return schedule.recurrence;
  }
}

export function recurrenceMeta(
  schedule: TaskSchedule | null,
  time?: string
): string {
  if (!schedule) return 'Én gang';
  const label = recurrenceLabel(schedule);
  if (schedule.recurrence === 'once' && time) {
    return `Én gang · kl. ${formatTimeShort(time)}`;
  }
  if (schedule.recurrence === 'daily' || schedule.recurrence === 'weekly' || schedule.recurrence === 'weekdays') {
    return `↻ ${label}`;
  }
  return label;
}

function resolveScheduleFromOccurrence(
  occurrence: TaskOccurrence,
  template?: TaskTemplate
): TaskSchedule | null {
  const snapshot = occurrence.scheduleSnapshot as { schedule?: TaskSchedule } | undefined;
  if (snapshot?.schedule) return snapshot.schedule;
  if (template) return resolveTemplateSchedule(template);
  return null;
}

function resolveNagFromOccurrence(
  occurrence: TaskOccurrence,
  template?: TaskTemplate
): NagCadence {
  const snapshot = occurrence.reminderPlanSnapshot as { nag?: { cadence: NagCadence } } | undefined;
  if (snapshot?.nag?.cadence) return snapshot.nag.cadence;
  if (template) return resolveTemplateNag(template).cadence;
  return '15m';
}

export function occurrenceDisplayMeta(
  occurrence: TaskOccurrence,
  template?: TaskTemplate
): { meta: string; nag: NagCadence; nagText: string; recurrence: RecurrenceKind | 'once' } {
  const schedule = resolveScheduleFromOccurrence(occurrence, template);
  const nag = resolveNagFromOccurrence(occurrence, template);
  const recurrence = schedule?.recurrence ?? 'once';
  return {
    meta: recurrenceMeta(schedule, occurrence.scheduledLocalTime),
    nag,
    nagText: nagLabel(nag),
    recurrence,
  };
}

export function groupOccurrences(occurrences: TaskOccurrence[]): GroupedOccurrences[] {
  const today = localDateInTz();
  const tomorrow = addDaysLocal(today, 1);

  const overdue: TaskOccurrence[] = [];
  const laterToday: TaskOccurrence[] = [];
  const tomorrowItems: TaskOccurrence[] = [];
  const later: TaskOccurrence[] = [];

  const sorted = [...occurrences].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  for (const occ of sorted) {
    if (isOverdue(occ)) {
      overdue.push(occ);
      continue;
    }
    const date = occ.scheduledLocalDate;
    if (date === today) {
      laterToday.push(occ);
    } else if (date === tomorrow) {
      tomorrowItems.push(occ);
    } else {
      later.push(occ);
    }
  }

  const groups: GroupedOccurrences[] = [];
  if (overdue.length) {
    groups.push({ section: 'overdue', label: 'Forfaldne', items: overdue, showCount: true });
  }
  if (laterToday.length) {
    groups.push({ section: 'laterToday', label: 'Senere i dag', items: laterToday });
  }
  if (tomorrowItems.length) {
    groups.push({ section: 'tomorrow', label: 'I morgen', items: tomorrowItems });
  }
  if (later.length) {
    groups.push({ section: 'later', label: 'Senere', items: later });
  }
  return groups;
}

export function occurrenceTitle(occurrence: TaskOccurrence, templates: TaskTemplate[]): string {
  if (occurrence.templateTitle) return occurrence.templateTitle;
  return templates.find((t) => t.id === occurrence.templateId)?.title ?? 'Ukendt opgave';
}

export function nextReminderLabel(occurrence: TaskOccurrence): string {
  const target = occurrence.nextReminderAt ?? occurrence.scheduledAt;
  const today = localDateInTz();
  const targetDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(target));
  const time = formatTimeShort(target);
  if (targetDate === today) return `I dag ${time}`;
  if (targetDate === addDaysLocal(today, 1)) return `I morgen ${time}`;
  return `${new Intl.DateTimeFormat('da-DK', { dateStyle: 'medium', timeZone: TZ }).format(new Date(target))} ${time}`;
}
