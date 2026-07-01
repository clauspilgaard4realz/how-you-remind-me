import { useState } from 'react';
import type { SnoozePreset, TaskOccurrence } from '@hyrm/shared';
import {
  combineLocalDateAndTime,
  defaultReminderStart,
  formatLocalDateTime,
  quarterTimeOptions,
} from '../lib/time';
import { isSnoozeExpired } from '../lib/occurrence';

const PRESETS: { preset: SnoozePreset; label: string }[] = [
  { preset: '15m', label: '15 min' },
  { preset: '1h', label: '1 time' },
  { preset: 'tomorrow', label: '1 dag' },
];

export function SnoozeControls({
  occurrence,
  busy,
  onSnooze,
  compact,
}: {
  occurrence: TaskOccurrence;
  busy: boolean;
  onSnooze: (preset: SnoozePreset, customAt?: string) => Promise<void>;
  compact?: boolean;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const defaults = defaultReminderStart();
  const [customDate, setCustomDate] = useState(defaults.date);
  const [customTime, setCustomTime] = useState(defaults.time);
  const [error, setError] = useState<string | null>(null);

  async function handlePreset(preset: SnoozePreset) {
    setError(null);
    try {
      await onSnooze(preset);
      setShowCustom(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke udsætte');
    }
  }

  async function handleCustom() {
    setError(null);
    try {
      await onSnooze('custom', combineLocalDateAndTime(customDate, customTime));
      setShowCustom(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke udsætte');
    }
  }

  const snoozeActive =
    occurrence.status === 'snoozed' &&
    occurrence.snoozedUntil &&
    !isSnoozeExpired(occurrence.snoozedUntil);

  return (
    <div className={compact ? 'mt-3' : 'mt-3 space-y-2 border-t border-white/6 pt-3'}>
      {!compact && snoozeActive && (
        <p className="text-sm text-hyrm-accent">
          Udsat til {formatLocalDateTime(occurrence.snoozedUntil!)}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <span className="flex-none text-[11px] font-semibold text-hyrm-muted">Udsæt</span>
        {PRESETS.map(({ preset, label }) => (
          <button
            key={preset}
            type="button"
            disabled={busy}
            onClick={() => void handlePreset(preset)}
            className="flex-1 rounded-[9px] bg-hyrm-surface py-1.5 text-center text-[11px] font-semibold text-hyrm-time disabled:opacity-50"
          >
            {busy ? '…' : label}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowCustom((open) => !open)}
          className="flex-1 rounded-[9px] bg-hyrm-surface py-1.5 text-center text-[11px] font-semibold text-hyrm-time disabled:opacity-50"
        >
          Vælg
        </button>
      </div>
      {showCustom && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block space-y-1 text-sm">
            <span className="text-hyrm-muted">Dato</span>
            <input
              type="date"
              className="rounded-[14px] border border-white/10 bg-hyrm-bg px-3 py-2 text-hyrm-text"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-hyrm-muted">Tid</span>
            <select
              className="rounded-[14px] border border-white/10 bg-hyrm-bg px-3 py-2 text-hyrm-text"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            >
              {quarterTimeOptions().map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCustom()}
            className="rounded-[var(--radius-btn)] bg-hyrm-accent px-4 py-2 text-sm font-bold text-hyrm-bg"
          >
            Gem
          </button>
        </div>
      )}
      {error && <p className="text-sm text-hyrm-danger">{error}</p>}
    </div>
  );
}
