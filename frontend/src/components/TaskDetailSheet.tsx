import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TaskOccurrence, TaskSchedule, TaskTemplate } from '@hyrm/shared';
import {
  formatTimeShort,
  isOverdue,
  nagLabelShort,
  nextReminderLabel,
  occurrenceDisplayMeta,
  recurrenceLabel,
} from '../lib/taskDisplay';
import { Button, StatusBadge } from './ui';

export function TaskDetailSheet({
  occurrence,
  title,
  template,
  open,
  busy,
  onClose,
  onComplete,
  onDelete,
}: {
  occurrence: TaskOccurrence | null;
  title: string;
  template?: TaskTemplate;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !occurrence) return null;

  const { meta, nag, recurrence } = occurrenceDisplayMeta(occurrence, template);
  const overdue = isOverdue(occurrence);
  const status =
    occurrence.status === 'snoozed'
      ? 'snoozed'
      : overdue
        ? 'overdue'
        : occurrence.status === 'completed'
          ? 'completed'
          : 'open';

  const schedule = (occurrence.scheduleSnapshot as { schedule?: TaskSchedule } | undefined)
    ?.schedule ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Luk"
        className="absolute inset-0 bg-[rgba(6,5,9,0.62)]"
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-sheet)] bg-hyrm-sheet px-[22px] pb-[calc(2rem+var(--safe-bottom))] pt-3 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.7)]">
        <div className="mx-auto mb-5 h-1 w-[38px] rounded-full bg-hyrm-checkbox" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-[22px] font-bold leading-tight text-hyrm-text">
            {title}
          </h2>
          <StatusBadge status={status} />
        </div>

        <dl className="divide-y divide-white/6">
          <DetailRow label="Gentagelse" value={recurrenceLabel(schedule) || meta.replace('↻ ', '')} />
          <DetailRow
            label="Tidspunkt"
            value={formatTimeShort(occurrence.scheduledLocalTime)}
          />
          <DetailRow label="Nag" value={nagLabelShort(nag)} accent />
          <DetailRow label="Næste" value={nextReminderLabel(occurrence)} />
        </dl>

        <Button fullWidth className="mt-4 h-[50px]" disabled={busy} onClick={onComplete}>
          {busy ? '…' : 'Marker som klaret'}
        </Button>
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            className="h-[46px]"
            onClick={() =>
              navigate(`/edit/${occurrence.templateId}`, {
                state: { occurrenceId: occurrence.id, recurrence },
              })
            }
          >
            Redigér
          </Button>
          <Button variant="danger" fullWidth className="h-[46px]" disabled={busy} onClick={onDelete}>
            Slet
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-[13px] font-medium text-hyrm-muted">{label}</dt>
      <dd className={`text-[13px] font-semibold ${accent ? 'text-hyrm-accent' : 'text-hyrm-text'}`}>
        {value}
      </dd>
    </div>
  );
}
