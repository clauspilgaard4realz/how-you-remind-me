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
  now: DateTime = DateTime.now().setZone(TIMEZONE)
): string {
  switch (preset) {
    case '15m':
      return ceilToDispatchSlotIso(now.plus({ minutes: 15 }).toUTC().toISO()!);
    case '1h':
      return ceilToDispatchSlotIso(now.plus({ hours: 1 }).toUTC().toISO()!);
    case 'tomorrow': {
      const wake = now.plus({ days: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
      return ceilToDispatchSlotIso(wake.toUTC().toISO()!);
    }
    case 'custom':
      if (!customAt) throw new Error('customAt is required');
      return ceilToDispatchSlotIso(customAt);
    default:
      throw new Error(`Unknown snooze preset: ${String(preset)}`);
  }
}

export function resolveSnoozeWakeAt(body: SnoozeOccurrenceRequest): string {
  const wakeAt = computeSnoozeWakeAt(body.preset, body.customAt);
  if (wakeAt <= new Date().toISOString()) {
    throw new Error('Snooze time must be in the future');
  }
  return wakeAt;
}
