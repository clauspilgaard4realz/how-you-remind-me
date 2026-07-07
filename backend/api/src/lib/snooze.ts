import { DateTime } from 'luxon';
import {
  ceilToDispatchSlotIso,
  TIMEZONE,
  type SnoozeOccurrenceRequest,
  type SnoozePreset,
} from '@hyrm/shared';

export function computeSnoozeWakeAt(
  preset: SnoozePreset,
  customAt?: string,
  now: DateTime = DateTime.now().setZone(TIMEZONE),
  scheduledLocalTime?: string
): string {
  switch (preset) {
    case '15m':
      return ceilToDispatchSlotIso(now.plus({ minutes: 15 }).toUTC().toISO()!);
    case '1h':
      return ceilToDispatchSlotIso(now.plus({ hours: 1 }).toUTC().toISO()!);
    case 'tomorrow': {
      const [hour, minute] = (scheduledLocalTime ?? '09:00').split(':').map(Number);
      const wake = now
        .plus({ days: 1 })
        .set({ hour, minute, second: 0, millisecond: 0 });
      return ceilToDispatchSlotIso(wake.toUTC().toISO()!);
    }
    case 'custom':
      if (!customAt) throw new Error('customAt is required');
      return ceilToDispatchSlotIso(customAt);
    default:
      throw new Error(`Unknown snooze preset: ${String(preset)}`);
  }
}

export function resolveSnoozeWakeAt(
  body: SnoozeOccurrenceRequest,
  now: DateTime = DateTime.now().setZone(TIMEZONE)
): string {
  const wakeAt = computeSnoozeWakeAt(body.preset, body.customAt, now, body.scheduledLocalTime);
  if (wakeAt <= new Date().toISOString()) {
    throw new Error('Snooze time must be in the future');
  }
  return wakeAt;
}
