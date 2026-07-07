import type { SnoozePreset, TaskOccurrence, TaskTemplate } from '@hyrm/shared';
import {
  canIgnoreOccurrence,
  formatOccurrenceDateShort,
  formatTimeShort,
  isDeadlineOverdue,
  isOverdue,
  occurrenceDisplayMeta,
  overdueDelayLabel,
  resolveScheduleFromOccurrence,
} from '../lib/taskDisplay';
import { isDeadlineSchedule } from '@hyrm/shared';
import { NagChip } from './ui';
import { SnoozeControls } from './SnoozeControls';

export function TaskRow({
  occurrence,
  title,
  template,
  overdue,
  expanded,
  highlighted,
  showDate,
  completing,
  snoozing,
  onOpen,
  onComplete,
  onIgnore,
  onSnooze,
}: {
  occurrence: TaskOccurrence;
  title: string;
  template?: TaskTemplate;
  overdue?: boolean;
  expanded?: boolean;
  highlighted?: boolean;
  showDate?: boolean;
  completing: boolean;
  snoozing: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onIgnore?: () => void;
  onSnooze: (preset: SnoozePreset, customAt?: string) => Promise<void>;
}) {
  const { meta, nagText } = occurrenceDisplayMeta(occurrence, template);
  const showOverdue = overdue ?? isOverdue(occurrence);
  const showIgnore = canIgnoreOccurrence(occurrence, template);
  const deadlinePassed = isDeadlineOverdue(occurrence, template);
  const schedule = resolveScheduleFromOccurrence(occurrence, template);
  const isDeadlineTask = schedule ? isDeadlineSchedule(schedule) : false;
  const busy = completing || snoozing;
  const time = formatTimeShort(occurrence.scheduledLocalTime);
  const dateLabel = showDate
    ? formatOccurrenceDateShort(occurrence.scheduledLocalDate)
    : null;

  function TimeColumn() {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[13px] font-bold text-hyrm-time">{time}</span>
        {dateLabel && (
          <span className="text-[10px] font-medium text-hyrm-muted-dim">{dateLabel}</span>
        )}
      </div>
    );
  }

  if (expanded || showOverdue) {
    return (
      <div
        className={`mb-4 rounded-[var(--radius-card)] border p-[15px] ${
          showOverdue
            ? 'border-hyrm-danger/35 bg-hyrm-overdue-bg'
            : highlighted
              ? 'border-hyrm-accent/50 bg-hyrm-elevated'
              : 'border-white/6 bg-hyrm-elevated'
        }`}
      >
        <button type="button" onClick={onOpen} className="w-full text-left">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 h-[22px] w-[22px] flex-none rounded-full border-2 ${
                showOverdue ? 'border-hyrm-danger' : 'border-hyrm-checkbox'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[15px] text-hyrm-text">{title}</div>
              {showOverdue && (
                <div className="mt-1 text-[12px] font-medium text-hyrm-danger">
                  {deadlinePassed
                    ? 'Deadline overskredet'
                    : `${overdueDelayLabel(occurrence)} · ${meta.replace('↻ ', '')}`}
                </div>
              )}
              {!showOverdue && (
                <div className="mt-1 text-[12px] font-medium text-hyrm-muted">{meta}</div>
              )}
              {nagText !== 'Kun én gang' && (
                <div className="mt-2">
                  <NagChip label={nagText} />
                </div>
              )}
            </div>
            {!showOverdue && <TimeColumn />}
          </div>
        </button>
        {showOverdue && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="mt-3 h-10 w-full rounded-[11px] bg-hyrm-accent text-[13px] font-bold text-hyrm-bg disabled:opacity-50"
            >
              {completing ? '…' : 'Klaret'}
            </button>
            {showIgnore && onIgnore && (
              <button
                type="button"
                disabled={busy}
                onClick={onIgnore}
                className="mt-2 h-10 w-full rounded-[11px] bg-hyrm-surface text-[13px] font-semibold text-hyrm-time disabled:opacity-50"
              >
                {completing ? '…' : 'Ignorer i dag'}
              </button>
            )}
            {!showIgnore && !isDeadlineTask && (
              <SnoozeControls
                occurrence={occurrence}
                busy={snoozing}
                onSnooze={onSnooze}
                compact
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-start gap-3 border-b border-white/6 py-3 text-left last:border-b-0 ${
        highlighted ? 'bg-hyrm-accent/5' : ''
      }`}
    >
      <span className="mt-0.5 h-[22px] w-[22px] flex-none rounded-full border-2 border-hyrm-checkbox" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold text-[15px] text-hyrm-text">{title}</span>
          <TimeColumn />
        </div>
        <div className="mt-1 text-[12px] font-medium text-hyrm-muted">{meta}</div>
        {nagText !== 'Kun én gang' && (
          <div className="mt-2">
            <NagChip label={nagText} />
          </div>
        )}
      </div>
    </button>
  );
}
