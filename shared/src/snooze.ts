import { DISPATCH_RESOLUTION_MINUTES } from './constants.js';

export type SnoozePreset = '15m' | '1h' | 'tomorrow' | 'custom';

export interface SnoozeOccurrenceRequest {
  preset: SnoozePreset;
  /** ISO-8601 UTC — påkrævet når preset er custom */
  customAt?: string;
}

export function ceilToDispatchSlotIso(iso: string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) {
    throw new Error('Invalid datetime');
  }
  const quarterMs = DISPATCH_RESOLUTION_MINUTES * 60_000;
  const ceiled = Math.ceil(ms / quarterMs) * quarterMs;
  return new Date(ceiled).toISOString();
}

export function validateSnoozeOccurrence(body: SnoozeOccurrenceRequest): string | null {
  const presets: SnoozePreset[] = ['15m', '1h', 'tomorrow', 'custom'];
  if (!body.preset || !presets.includes(body.preset)) {
    return 'preset must be one of: 15m, 1h, tomorrow, custom';
  }
  if (body.preset === 'custom') {
    if (!body.customAt) return 'customAt is required for custom preset';
    const parsed = new Date(body.customAt);
    if (Number.isNaN(parsed.getTime())) return 'Invalid customAt';
    if (ceilToDispatchSlotIso(body.customAt) <= new Date().toISOString()) {
      return 'customAt must be in the future';
    }
  }
  return null;
}
