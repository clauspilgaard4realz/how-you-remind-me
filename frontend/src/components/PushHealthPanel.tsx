import type { DispatchHealth } from '@hyrm/shared';
import { formatLocalDateTime } from '../lib/time';
import type { PushHealthState } from '../lib/push';
import { Banner, Card } from './ui';

export function PushHealthPanel({
  dispatchHealth,
  pushState,
  compact = false,
}: {
  dispatchHealth: DispatchHealth | null;
  pushState: PushHealthState | null;
  compact?: boolean;
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
    <Card className={compact ? 'border-white/4 bg-hyrm-bg/50 p-3' : ''}>
      {!compact && (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-hyrm-muted">
          Push-status
        </h2>
      )}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-hyrm-muted">Notification.permission</dt>
          <dd>{pushState.notificationPermission}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-hyrm-muted">PushManager permission</dt>
          <dd>{pushState.pushPermissionState}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-hyrm-muted">Subscription</dt>
          <dd>{pushState.hasSubscription ? 'Aktiv' : 'Mangler'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-hyrm-muted">Service worker</dt>
          <dd>{pushState.hasServiceWorker ? 'Aktiv' : 'Mangler'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-hyrm-muted">PWA standalone</dt>
          <dd>{pushState.isStandalone ? 'Ja' : 'Nej'}</dd>
        </div>
        {dispatchHealth && (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-hyrm-muted">Seneste dispatch</dt>
              <dd>{formatLocalDateTime(dispatchHealth.lastDispatchCompletedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-hyrm-muted">Åbne uden enhed</dt>
              <dd>{dispatchHealth.openOccurrencesWithoutDevice}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-hyrm-muted">E-mail backup</dt>
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
