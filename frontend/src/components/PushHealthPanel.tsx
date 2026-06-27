import { useEffect, useState } from 'react';
import type { DispatchHealth } from '@hyrm/shared';
import { formatLocalDateTime } from '../lib/time';
import { getPushHealthState, type PushHealthState } from '../lib/push';
import { Banner, Card } from './ui';

export function PushHealthPanel({ dispatchHealth }: { dispatchHealth: DispatchHealth | null }) {
  const [pushState, setPushState] = useState<PushHealthState | null>(null);

  useEffect(() => {
    void getPushHealthState().then(setPushState);
  }, []);

  if (!pushState) return null;

  const issues: string[] = [];
  if (!pushState.isStandalone) {
    issues.push('Appen er ikke installeret på hjemmeskærmen (kræves for push på iPhone).');
  }
  if (pushState.permission === 'denied') {
    issues.push('Notifikationer er blokeret i browser/OS.');
  }
  if (pushState.permission === 'default') {
    issues.push('Notifikationstilladelse er ikke givet endnu.');
  }
  if (pushState.permission === 'granted' && !pushState.hasSubscription) {
    issues.push('Ingen aktiv push-subscription registreret.');
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Push-status
      </h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Tilladelse</dt>
          <dd>{pushState.permission}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Subscription</dt>
          <dd>{pushState.hasSubscription ? 'Aktiv' : 'Mangler'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">PWA standalone</dt>
          <dd>{pushState.isStandalone ? 'Ja' : 'Nej'}</dd>
        </div>
        {dispatchHealth && (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Seneste dispatch</dt>
              <dd>{formatLocalDateTime(dispatchHealth.lastDispatchCompletedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Åbne uden enhed</dt>
              <dd>{dispatchHealth.openOccurrencesWithoutDevice}</dd>
            </div>
          </>
        )}
      </dl>
      {issues.length > 0 && (
        <div className="mt-4 space-y-2">
          {issues.map((issue) => (
            <Banner key={issue} tone="warning">
              {issue}
            </Banner>
          ))}
        </div>
      )}
    </Card>
  );
}
