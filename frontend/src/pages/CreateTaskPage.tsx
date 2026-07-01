import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateTaskRequest, NagCadence, RecurrenceKind } from '@hyrm/shared';
import { WEEKDAY_OPTIONS } from '@hyrm/shared';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import {
  combineLocalDateAndTime,
  defaultReminderStart,
  quarterTimeOptions,
} from '../lib/time';
import { AppShell, Button, Card } from '../components/ui';

const RECURRENCE_OPTIONS: { value: RecurrenceKind; label: string }[] = [
  { value: 'once', label: 'Én gang' },
  { value: 'daily', label: 'Daglig' },
  { value: 'weekly', label: 'Ugentlig' },
  { value: 'weekdays', label: 'Bestemte ugedage' },
];

const NAG_OPTIONS: { value: NagCadence; label: string }[] = [
  { value: '15m', label: 'Nag hvert 15. min' },
  { value: '1h', label: 'Nag hver time' },
  { value: 'daily', label: 'Én gang pr. gang (ved tidspunkt)' },
];

export function CreateTaskPage() {
  const navigate = useNavigate();
  const { getIdToken } = useAuth();
  const defaults = defaultReminderStart();

  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceKind>('daily');
  const [nagCadence, setNagCadence] = useState<NagCadence>('15m');
  const [startDate, setStartDate] = useState(defaults.date);
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState(defaults.time);
  const [weekdays, setWeekdays] = useState<number[]>([3]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleWeekday(day: number) {
    setWeekdays((current) => {
      if (recurrence === 'weekly') {
        return [day];
      }
      return current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const schedule: CreateTaskRequest['schedule'] = {
      recurrence,
      timeOfDay: time,
      startLocalDate: recurrence === 'once' ? startDate : startDate,
      endLocalDate: endDate || undefined,
    };

    if (recurrence === 'weekly' || recurrence === 'weekdays') {
      schedule.daysOfWeek = weekdays;
    }

    const body: CreateTaskRequest = {
      title: title.trim(),
      schedule,
      nag: { cadence: nagCadence },
    };

    try {
      const token = await getIdToken();
      await apiFetch('/api/tasks', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oprette opgave');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Ny opgave">
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1 text-sm">
            <span className="text-slate-400">Hvad skal huskes?</span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm text-slate-400">Gentagelse</legend>
            <div className="flex flex-wrap gap-2">
              {RECURRENCE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${
                    recurrence === option.value
                      ? 'border-sky-500 bg-sky-950/50 text-white'
                      : 'border-slate-700 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="recurrence"
                    className="sr-only"
                    checked={recurrence === option.value}
                    onChange={() => {
                      setRecurrence(option.value);
                      if (option.value === 'weekly' && weekdays.length !== 1) {
                        setWeekdays([weekdays[0] ?? 3]);
                      }
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {(recurrence === 'weekly' || recurrence === 'weekdays') && (
            <fieldset className="space-y-2">
              <legend className="text-sm text-slate-400">
                {recurrence === 'weekly' ? 'Ugedag' : 'Ugedage'}
              </legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${
                      weekdays.includes(option.value)
                        ? 'border-sky-500 bg-sky-950/50 text-white'
                        : 'border-slate-700 text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={weekdays.includes(option.value)}
                      onChange={() => toggleWeekday(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm text-slate-400">Nag-type (mens opgaven er åben)</legend>
            <div className="flex flex-wrap gap-2">
              {NAG_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${
                    nagCadence === option.value
                      ? 'border-sky-500 bg-sky-950/50 text-white'
                      : 'border-slate-700 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="nag"
                    className="sr-only"
                    checked={nagCadence === option.value}
                    onChange={() => setNagCadence(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              <span className="text-slate-400">
                {recurrence === 'once' ? 'Dato' : 'Startdato'}
              </span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-400">Tidspunkt (kvarter)</span>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                {quarterTimeOptions().map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {recurrence !== 'once' && (
            <label className="block space-y-1 text-sm">
              <span className="text-slate-400">Slutdato (valgfri — fx deadline)</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          )}

          {recurrence === 'once' && (
            <p className="text-xs text-slate-500">
              Engangsopgave starter {formatPreview(startDate, time)}.
            </p>
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Gemmer…' : 'Gem opgave'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Annuller
            </Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}

function formatPreview(date: string, time: string): string {
  try {
    return new Intl.DateTimeFormat('da-DK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Copenhagen',
    }).format(new Date(combineLocalDateAndTime(date, time)));
  } catch {
    return `${date} ${time}`;
  }
}
