import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateSingleTaskRequest } from '@hyrm/shared';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import {
  combineLocalDateAndTime,
  defaultReminderStart,
  quarterTimeOptions,
} from '../lib/time';
import { AppShell, Button, Card } from '../components/ui';

export function CreateTaskPage() {
  const navigate = useNavigate();
  const { getIdToken } = useAuth();
  const defaults = defaultReminderStart();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const body: CreateSingleTaskRequest = {
      title: title.trim(),
      reminderStartsAt: combineLocalDateAndTime(date, time),
      reminderPhases: [
        {
          id: 'phase-1',
          anchor: 'occurrence_scheduled_at',
          cadence: { unit: 'minutes', every: 15 },
          channels: ['push'],
        },
      ],
    };

    try {
      const token = await getIdToken();
      await apiFetch('/api/tasks/single', {
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

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              <span className="text-slate-400">Dato</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-400">Tid (kvarter)</span>
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

          <p className="text-xs text-slate-500">
            PoC: én single opgave med reminder hvert 15. minut fra valgt tidspunkt.
          </p>

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
