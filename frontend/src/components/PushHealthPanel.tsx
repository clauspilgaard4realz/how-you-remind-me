import type { DispatchHealth } from '@hyrm/shared';
import { formatLocalDateTime } from '../lib/time';
import type { PushHealthState } from '../lib/push';
import { Banner, Card } from './ui';

export function PushHealthPanel({
  dispatchHealth,
  pushState,
}: {
  dispatchHealth: DispatchHealth | null;
  pushState: PushHealthState | null;
}) {
  if (!pushState) return null;

  const issues: string[] = [];
  if (!pushState.isStandalone) {
    issues.push('Appen er ikke installeret på hjemmeskærmen (kræves for push på iPhone).');
  }
  if (pushState.notificationPermission === 'denied') {
    issues.push('Notifikationer er blokeret. Gå til Indstillinger → søg efter "How You Remind Me".');
  }
  if (pushState.permissionMismatch) {
    issues.push(
      'Subscription findes, men iOS-tilladelse mangler. Tryk "Aktivér push" igen og vælg Tillad i system-dialogen.'
    );
  }
  if (
    pushState.notificationPermission === 'default' &&
    !pushState.hasSubscription &&
    pushState.isStandalone
  ) {
    issues.push('Notifikationstilladelse er ikke givet endnu.');
  }
  if (!pushState.hasServiceWorker && pushState.isStandalone) {
    issues.push('Service worker kører ikke endnu — genindlæs appen.');
  }
  if (
    pushState.notificationPermission === 'granted' &&
    pushState.pushPermissionState === 'granted' &&
    !pushState.hasSubscription
  ) {
    issues.push('Tilladelse OK, men ingen push-subscription — tryk "Aktivér push".');
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Push-status
      </h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Notification.permission</dt>
          <dd>{pushState.notificationPermission}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">PushManager permission</dt>
          <dd>{pushState.pushPermissionState}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Subscription</dt>
          <dd>{pushState.hasSubscription ? 'Aktiv' : 'Mangler'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Service worker</dt>
          <dd>{pushState.hasServiceWorker ? 'Aktiv' : 'Mangler'}</dd>
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
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">E-mail backup</dt>
              <dd>{dispatchHealth.emailConfigured ? 'Aktiv' : 'Ikke konfigureret'}</dd>
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
