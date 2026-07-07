import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TaskOccurrence, TaskTemplate } from '@hyrm/shared';
import {
  canIgnoreOccurrence,
  formatDeadlineDate,
  formatTimeShort,
  isDeadlineOverdue,
  isOverdue,
  nagLabelShort,
  nextReminderLabel,
  occurrenceDisplayMeta,
  recurrenceLabel,
  resolveScheduleFromOccurrence,
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
  onIgnore,
  onDelete,
}: {
  occurrence: TaskOccurrence | null;
  title: string;
  template?: TaskTemplate;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onComplete: () => void;
  onIgnore?: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const dragRef = useRef({ startY: 0, startTranslate: 0, dragging: false, lastY: 0, lastTime: 0 });
  const [translateY, setTranslateY] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setTranslateY(0);
      setAnimating(false);
    }
  }, [open, occurrence?.id]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    dragRef.current = {
      startY: e.clientY,
      startTranslate: translateY,
      dragging: true,
      lastY: e.clientY,
      lastTime: e.timeStamp,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setAnimating(false);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.dragging) return;
    const delta = e.clientY - dragRef.current.startY;
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = e.timeStamp;
    setTranslateY(Math.max(0, dragRef.current.startTranslate + delta));
  }

  function finishDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const delta = e.clientY - dragRef.current.startY;
    const elapsed = e.timeStamp - dragRef.current.lastTime;
    const recentDelta = e.clientY - dragRef.current.lastY;
    const velocity = elapsed > 0 ? recentDelta / elapsed : 0;
    const shouldDismiss = translateY > 100 || (delta > 40 && velocity > 0.5);

    setAnimating(true);
    if (shouldDismiss) {
      setTranslateY(window.innerHeight);
      window.setTimeout(() => onClose(), 200);
    } else {
      setTranslateY(0);
    }
  }

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

  const schedule = resolveScheduleFromOccurrence(occurrence, template);
  const deadlineLabel = formatDeadlineDate(schedule);
  const showIgnore = canIgnoreOccurrence(occurrence, template);
  const deadlinePassed = isDeadlineOverdue(occurrence, template);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Luk"
        className="absolute inset-0 bg-[rgba(6,5,9,0.62)]"
        onClick={onClose}
      />
      <div
        className="relative max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-sheet)] bg-hyrm-sheet px-[22px] pb-[calc(2rem+var(--safe-bottom))] pt-3 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.7)]"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: animating ? 'transform 200ms ease-out' : 'none',
        }}
      >
        <div
          className="mx-auto mb-5 h-1 w-[38px] cursor-grab rounded-full bg-hyrm-checkbox active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-[22px] font-bold leading-tight text-hyrm-text">
            {title}
          </h2>
          <StatusBadge status={status} />
        </div>

        {deadlinePassed && (
          <p className="mb-3 text-[13px] font-semibold text-hyrm-danger">
            Deadline er overskredet — påmindelser eskaleres til hvert 15. min
          </p>
        )}

        <dl className="divide-y divide-white/6">
          <DetailRow label="Gentagelse" value={recurrenceLabel(schedule) || meta.replace('↻ ', '')} />
          {deadlineLabel && <DetailRow label="Deadline" value={deadlineLabel} accent={deadlinePassed} />}
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
        {showIgnore && onIgnore && (
          <Button
            variant="secondary"
            fullWidth
            className="mt-2 h-[46px]"
            disabled={busy}
            onClick={onIgnore}
          >
            {busy ? '…' : 'Ignorer i dag'}
          </Button>
        )}
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
            {deadlinePassed ? 'Redigér deadline' : 'Redigér'}
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
