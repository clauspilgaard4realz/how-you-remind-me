import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { CreateTaskRequest, NagCadence, RecurrenceKind, RecurringTaskTemplate } from '@hyrm/shared';
import { WEEKDAY_OPTIONS, resolveTemplateSchedule } from '@hyrm/shared';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useTaskTemplates } from '../hooks/useFirestoreData';
import {
  defaultReminderStart,
  quarterTimeOptions,
} from '../lib/time';
import { AppShell, Button, Pill } from '../components/ui';

const RECURRENCE_OPTIONS: { value: RecurrenceKind; label: string }[] = [
  { value: 'once', label: 'Én gang' },
  { value: 'daily', label: 'Dagligt' },
  { value: 'weekly', label: 'Ugentlig' },
  { value: 'weekdays', label: 'Bestemte ugedage' },
];

const NAG_OPTIONS: { value: NagCadence; label: string }[] = [
  { value: '15m', label: 'Hvert 15. min' },
  { value: '1h', label: 'Hver time' },
  { value: 'daily', label: 'Kun én gang' },
];

type EditScope = 'instance' | 'series';

export function CreateTaskPage() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const location = useLocation();
  const occurrenceId = (location.state as { occurrenceId?: string } | null)?.occurrenceId;
  const isEdit = Boolean(templateId);
  const { getIdToken } = useAuth();
  const { templates, loading: templatesLoading } = useTaskTemplates();
  const template = useMemo(
    () => templates.find((t) => t.id === templateId) as RecurringTaskTemplate | undefined,
    [templates, templateId]
  );

  const defaults = defaultReminderStart();
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceKind>('daily');
  const [nagCadence, setNagCadence] = useState<NagCadence>('15m');
  const [startDate, setStartDate] = useState(defaults.date);
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState(defaults.time);
  const [weekdays, setWeekdays] = useState<number[]>([3]);
  const [editScope, setEditScope] = useState<EditScope>('series');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(!isEdit);

  useEffect(() => {
    if (!isEdit || !template) return;
    const schedule = resolveTemplateSchedule(template);
    if (!schedule) return;
    setTitle(template.title);
    setRecurrence(schedule.recurrence);
    setNagCadence(template.nag?.cadence ?? '15m');
    setStartDate(schedule.startLocalDate);
    setEndDate(schedule.endLocalDate ?? '');
    setTime(schedule.timeOfDay);
    if (schedule.daysOfWeek?.length) setWeekdays(schedule.daysOfWeek);
    setInitialized(true);
  }, [isEdit, template]);

  function toggleWeekday(day: number) {
    setWeekdays((current) => {
      if (recurrence === 'weekly') return [day];
      return current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    });
  }

  function buildBody(): CreateTaskRequest {
    const schedule: CreateTaskRequest['schedule'] = {
      recurrence,
      timeOfDay: time,
      startLocalDate: startDate,
      endLocalDate: endDate || undefined,
    };
    if (recurrence === 'weekly' || recurrence === 'weekdays') {
      schedule.daysOfWeek = weekdays;
    }
    return {
      title: title.trim(),
      schedule,
      nag: { cadence: nagCadence },
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const body = buildBody();

    try {
      const token = await getIdToken();
      if (isEdit && templateId) {
        if (editScope === 'instance' && occurrenceId) {
          await apiFetch(`/api/occurrences/${occurrenceId}`, {
            method: 'PUT',
            token,
            body: JSON.stringify(body),
          });
        } else {
          await apiFetch(`/api/tasks/${templateId}`, {
            method: 'PUT',
            token,
            body: JSON.stringify(body),
          });
        }
      } else {
        await apiFetch('/api/tasks', {
          method: 'POST',
          token,
          body: JSON.stringify(body),
        });
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke gemme opgave');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSeries() {
    if (!templateId) return;
    setSaving(true);
    try {
      const token = await getIdToken();
      if (editScope === 'instance' && occurrenceId) {
        await apiFetch(`/api/occurrences/${occurrenceId}`, {
          method: 'DELETE',
          token,
        });
      } else {
        await apiFetch(`/api/tasks/${templateId}`, {
          method: 'DELETE',
          token,
        });
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke slette');
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && templatesLoading && !initialized) {
    return (
      <AppShell title="Redigér opgave">
        <p className="text-sm text-hyrm-muted">Indlæser…</p>
      </AppShell>
    );
  }

  const showScopePicker = isEdit && recurrence !== 'once';

  return (
    <AppShell
      title={isEdit ? 'Redigér opgave' : 'Ny opgave'}
      actions={
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex min-h-11 min-w-11 items-center justify-end text-[13px] font-semibold text-hyrm-muted"
        >
          Annuller
        </button>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {showScopePicker && (
          <div className="rounded-[14px] bg-hyrm-surface p-3">
            <p className="mb-2 text-[11px] font-semibold text-hyrm-muted">Ændringer gælder</p>
            <div className="flex gap-1.5 rounded-[11px] bg-hyrm-bg p-1">
              <button
                type="button"
                onClick={() => setEditScope('instance')}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold ${
                  editScope === 'instance'
                    ? 'bg-hyrm-elevated text-hyrm-time'
                    : 'text-hyrm-muted'
                }`}
              >
                Kun denne gang
              </button>
              <button
                type="button"
                onClick={() => setEditScope('series')}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-bold ${
                  editScope === 'series'
                    ? 'bg-hyrm-accent text-hyrm-bg'
                    : 'text-hyrm-muted'
                }`}
              >
                Hele serien
              </button>
            </div>
          </div>
        )}

        <label className="block space-y-2">
          <span className="text-[12px] font-semibold text-hyrm-muted">Hvad skal huskes?</span>
          <input
            className="h-[50px] w-full rounded-[14px] border border-hyrm-accent/50 bg-hyrm-surface px-4 text-[15px] font-semibold text-hyrm-text outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-[12px] font-semibold text-hyrm-muted">Gentagelse</legend>
          <div className="flex flex-wrap gap-2">
            {RECURRENCE_OPTIONS.map((option) => (
              <Pill
                key={option.value}
                selected={recurrence === option.value}
                onClick={() => {
                  setRecurrence(option.value);
                  if (option.value === 'weekly' && weekdays.length !== 1) {
                    setWeekdays([weekdays[0] ?? 3]);
                  }
                }}
              >
                {option.value !== 'once' ? `↻ ${option.label}` : option.label}
              </Pill>
            ))}
          </div>
        </fieldset>

        {(recurrence === 'weekly' || recurrence === 'weekdays') && (
          <fieldset className="space-y-2">
            <legend className="text-[12px] font-semibold text-hyrm-muted">
              {recurrence === 'weekly' ? 'Ugedag' : 'Ugedage'}
            </legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((option) => (
                <Pill
                  key={option.value}
                  selected={weekdays.includes(option.value)}
                  onClick={() => toggleWeekday(option.value)}
                >
                  {option.label}
                </Pill>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="space-y-2">
          <legend className="text-[12px] font-semibold text-hyrm-muted">
            Nag <span className="font-medium text-hyrm-muted-dim">(mens opgaven er åben)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {NAG_OPTIONS.map((option) => (
              <Pill
                key={option.value}
                selected={nagCadence === option.value}
                accent={nagCadence === option.value}
                onClick={() => setNagCadence(option.value)}
              >
                {option.label}
              </Pill>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2 text-sm">
            <span className="text-[12px] font-semibold text-hyrm-muted">
              {recurrence === 'once' ? 'Dato' : 'Startdato'}
            </span>
            <input
              type="date"
              className="h-[50px] w-full rounded-[14px] border border-white/10 bg-hyrm-surface px-3 text-hyrm-text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-[12px] font-semibold text-hyrm-muted">Tidspunkt (kvarter)</span>
            <select
              className="h-[50px] w-full rounded-[14px] border border-white/10 bg-hyrm-surface px-3 text-hyrm-text"
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
          <label className="block space-y-2 text-sm">
            <span className="text-[12px] font-semibold text-hyrm-muted">
              Slutdato (valgfri — fx deadline)
            </span>
            <input
              type="date"
              className="h-[50px] w-full rounded-[14px] border border-white/10 bg-hyrm-surface px-3 text-hyrm-text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        )}

        {error && <p className="text-sm text-hyrm-danger">{error}</p>}

        <Button type="submit" fullWidth className="h-[50px]" disabled={saving}>
          {saving ? 'Gemmer…' : isEdit ? 'Gem ændringer' : 'Gem opgave'}
        </Button>

        {isEdit && (
          <Button
            type="button"
            variant="danger"
            fullWidth
            className="h-[46px]"
            disabled={saving}
            onClick={() => void handleDeleteSeries()}
          >
            {editScope === 'instance' ? 'Slet denne' : 'Slet hele serien'}
          </Button>
        )}
      </form>
    </AppShell>
  );
}
