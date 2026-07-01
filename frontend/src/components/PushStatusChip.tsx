import { useState } from 'react';
import type { DispatchHealth } from '@hyrm/shared';
import { formatLocalDateTime } from '../lib/time';
import type { PushHealthState } from '../lib/push';
import { Banner } from './ui';
import { PushHealthPanel } from './PushHealthPanel';

export function PushStatusChip({
  dispatchHealth,
  pushState,
  onEnablePush,
  pushBusy,
}: {
  dispatchHealth: DispatchHealth | null;
  pushState: PushHealthState | null;
  onEnablePush?: () => void;
  pushBusy?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!pushState) return null;

  const pushActive =
    pushState.notificationPermission === 'granted' &&
    pushState.pushPermissionState === 'granted' &&
    pushState.hasSubscription;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center gap-2 rounded-xl bg-hyrm-surface px-3.5 py-2.5 text-left text-[12px] font-semibold text-hyrm-muted"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${pushActive ? 'bg-hyrm-success' : 'bg-hyrm-danger'}`}
        />
        {pushActive ? 'Push aktiv' : 'Push inaktiv'}
        <span className="ml-auto text-hyrm-muted-dim">Avanceret ›</span>
      </button>

      {expanded && (
        <div className="space-y-3">
          {!pushActive && onEnablePush && (
            <button
              type="button"
              disabled={pushBusy}
              onClick={onEnablePush}
              className="w-full rounded-[var(--radius-btn)] bg-hyrm-accent px-4 py-2.5 text-sm font-bold text-hyrm-bg disabled:opacity-50"
            >
              {pushBusy ? 'Aktiverer…' : 'Aktivér push'}
            </button>
          )}
          <PushHealthPanel dispatchHealth={dispatchHealth} pushState={pushState} compact />
        </div>
      )}
    </div>
  );
}

export function PushInstallHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <Banner tone="info">
      På iPhone: Åbn i Safari → Del → Føj til hjemmeskærm → åbn appen derfra for at aktivere push.
    </Banner>
  );
}

export function PushMessageBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-hyrm-muted">{message}</p>;
}

export function formatDispatchSummary(health: DispatchHealth | null): string | null {
  if (!health?.lastDispatchCompletedAt) return null;
  return `Seneste dispatch: ${formatLocalDateTime(health.lastDispatchCompletedAt)}`;
}
