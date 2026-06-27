import { DateTime } from 'luxon';
import { DISPATCH_RESOLUTION_MINUTES, TIMEZONE } from '@hyrm/shared';

export function parseSchedulerSlot(reqHeaders: Record<string, string | string[] | undefined>): Date {
  const header = reqHeaders['x-cloudscheduler-scheduletime'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return floorToQuarterUtc(parsed);
    }
  }
  return floorToQuarterUtc(new Date());
}

export function floorToQuarterUtc(date: Date): Date {
  const dt = DateTime.fromJSDate(date, { zone: 'utc' });
  const minute = dt.minute;
  const floored = minute - (minute % DISPATCH_RESOLUTION_MINUTES);
  return dt.set({ minute: floored, second: 0, millisecond: 0 }).toJSDate();
}

export function addCadenceMinutes(iso: string, minutes: number): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).plus({ minutes }).toUTC().toISO()!;
}

export function formatSlotIso(date: Date): string {
  return date.toISOString();
}

export function localLabel(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).setZone(TIMEZONE).toFormat('yyyy-MM-dd HH:mm');
}
