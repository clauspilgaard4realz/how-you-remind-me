import { useState } from 'react';
import type { SnoozePreset, TaskOccurrence } from '@hyrm/shared';
import {
  combineLocalDateAndTime,
  defaultReminderStart,
  formatLocalDateTime,
  quarterTimeOptions,
} from '../lib/time';
import { isSnoozeExpired } from '../lib/occurrence';
import { Button } from './ui';

const PRESETS: { preset: SnoozePreset; label: string }[] = [
  { preset: '15m', label: '15 min' },
  { preset: '1h', label: '1 time' },
  { preset: 'tomorrow', label: 'I morgen kl. 09' },
];

export function SnoozeControls({
  occurrence,
  busy,
  onSnooze,
}: {
  occurrence: TaskOccurrence;
  busy: boolean;
  onSnooze: (preset: SnoozePreset, customAt?: string) => Promise<void>;
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
  const snoozeExpired =
    occurrence.status === 'snoozed' &&
    occurrence.snoozedUntil &&
    isSnoozeExpired(occurrence.snoozedUntil);

  return (
    <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Påmind mig</p>
      {snoozeActive && (
        <p className="text-sm text-sky-300">
          Udsat til {formatLocalDateTime(occurrence.snoozedUntil!)}
        </p>
      )}
      {snoozeExpired && (
        <p className="text-sm text-amber-300">
          Snooze udløbet — næste påmindelse ved næste dispatch-slot
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ preset, label }) => (
          <Button
            key={preset}
            variant="secondary"
            disabled={busy}
            onClick={() => void handlePreset(preset)}
          >
            {busy ? '…' : label}
          </Button>
        ))}
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => setShowCustom((open) => !open)}
        >
          Vælg tidspunkt
        </Button>
      </div>
      {showCustom && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block space-y-1 text-sm">
            <span className="text-slate-400">Dato</span>
            <input
              type="date"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-slate-400">Tid</span>
            <select
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
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
          <Button disabled={busy} onClick={() => void handleCustom()}>
            Gem
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
