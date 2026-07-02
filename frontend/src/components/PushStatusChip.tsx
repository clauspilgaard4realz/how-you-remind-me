import { useState } from 'react';
import type { DispatchHealth } from '@hyrm/shared';
import type { PushHealthState } from '../lib/push';
import { PushHealthPanel } from './PushHealthPanel';

function inactiveReason(pushState: PushHealthState): string {
  if (!pushState.isStandalone) {
    return 'Tilføj appen til hjemmeskærmen i Safari for at modtage påmindelser.';
  }
  if (pushState.notificationPermission === 'denied') {
    return 'Notifikationer er blokeret. Gå til Indstillinger og tillad dem for appen.';
  }
  return 'Aktivér push for at få påmindelser, når opgaver forfalder.';
}

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

  if (!pushActive) {
    return (
      <div className="space-y-2">
        <div className="rounded-[var(--radius-card)] border border-hyrm-danger/40 bg-hyrm-overdue-bg p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-hyrm-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-hyrm-danger">Push er ikke aktiv</p>
              <p className="mt-1 text-[12px] leading-relaxed text-hyrm-muted">
                {inactiveReason(pushState)}
              </p>
            </div>
          </div>
          {onEnablePush && (
            <button
              type="button"
              disabled={pushBusy}
              onClick={onEnablePush}
              className="mt-3 h-11 w-full rounded-[var(--radius-btn)] bg-hyrm-accent text-[14px] font-bold text-hyrm-bg disabled:opacity-50"
            >
              {pushBusy ? 'Aktiverer…' : 'Aktivér push'}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-center gap-2 rounded-xl bg-hyrm-surface px-3.5 py-2.5 text-left text-[12px] font-semibold text-hyrm-muted-dim"
        >
          Avanceret ›
          <span className="ml-auto text-[11px]">{expanded ? 'Skjul' : 'Vis detaljer'}</span>
        </button>
        {expanded && (
          <PushHealthPanel dispatchHealth={dispatchHealth} pushState={pushState} compact />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center gap-2 rounded-xl bg-hyrm-surface px-3.5 py-2.5 text-left text-[12px] font-semibold text-hyrm-muted"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-hyrm-success" />
        Push aktiv
        <span className="ml-auto text-hyrm-muted-dim">Avanceret ›</span>
      </button>
      {expanded && (
        <PushHealthPanel dispatchHealth={dispatchHealth} pushState={pushState} compact />
      )}
    </div>
  );
}

export function PushInstallHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return null;
}

export function PushMessageBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-hyrm-muted">{message}</p>;
}
