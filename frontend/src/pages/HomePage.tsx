import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { TaskOccurrence, TaskTemplate } from '@hyrm/shared';
import { apiFetch } from '../lib/api';
import {
  getExistingPushSubscription,
  getPushHealthState,
  isStandalonePwa,
  subscribeToPush,
  subscriptionToJson,
} from '../lib/push';
import { formatLocalDateTime } from '../lib/time';
import { useAuth } from '../hooks/useAuth';
import { useDispatchHealth, useOpenOccurrences, useTaskTemplates } from '../hooks/useFirestoreData';
import { PushHealthPanel } from '../components/PushHealthPanel';
import { AppShell, Banner, Button, Card } from '../components/ui';

function templateTitle(templateId: string, templates: TaskTemplate[]): string {
  return templates.find((t) => t.id === templateId)?.title ?? 'Ukendt opgave';
}

function OccurrenceRow({
  occurrence,
  title,
  highlighted,
  onComplete,
  completing,
}: {
  occurrence: TaskOccurrence;
  title: string;
  highlighted: boolean;
  onComplete: (id: string) => void;
  completing: string | null;
}) {
  return (
    <Card className={highlighted ? 'border-sky-500/60 ring-1 ring-sky-500/30' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Planlagt: {formatLocalDateTime(occurrence.scheduledAt)}
          </p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{occurrence.status}</p>
        </div>
        <Button
          variant="secondary"
          disabled={completing === occurrence.id}
          onClick={() => onComplete(occurrence.id)}
        >
          {completing === occurrence.id ? '…' : 'Klaret'}
        </Button>
      </div>
    </Card>
  );
}

export function HomePage() {
  const { getIdToken, signOutUser } = useAuth();
  const { templates } = useTaskTemplates();
  const { occurrences, loading } = useOpenOccurrences();
  const dispatchHealth = useDispatchHealth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('occurrence');

  useEffect(() => {
    if (import.meta.env.PROD) {
      void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
    }
  }, []);

  const [completing, setCompleting] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    void getPushHealthState().then((state) => {
      setNeedsInstall(!state.isStandalone);
    });
  }, []);

  async function enablePush() {
    setPushBusy(true);
    setPushMessage(null);
    try {
      if (!isStandalonePwa()) {
        setPushMessage('Tilføj appen til hjemmeskærmen i Safari først.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushMessage('Notifikationstilladelse blev ikke givet.');
        return;
      }
      const subscription = await subscribeToPush();
      const token = await getIdToken();
      await apiFetch('/api/push-devices', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...subscriptionToJson(subscription),
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        }),
      });
      setPushMessage('Push er aktiveret på denne enhed.');
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : 'Push-aktivering fejlede');
    } finally {
      setPushBusy(false);
    }
  }

  async function refreshPushRegistration() {
    const existing = await getExistingPushSubscription();
    if (!existing) return;
    const token = await getIdToken();
    await apiFetch('/api/push-devices', {
      method: 'POST',
      token,
      body: JSON.stringify({
        ...subscriptionToJson(existing),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      }),
    });
  }

  useEffect(() => {
    void refreshPushRegistration().catch(() => undefined);
  }, [getIdToken]);

  async function completeOccurrence(id: string) {
    setCompleting(id);
    try {
      const token = await getIdToken();
      await apiFetch(`/api/occurrences/${id}/complete`, {
        method: 'POST',
        token,
      });
    } finally {
      setCompleting(null);
    }
  }

  return (
    <AppShell
      title="Åbne nu"
      actions={
        <Button variant="secondary" onClick={() => void signOutUser()}>
          Log ud
        </Button>
      }
    >
      {needsInstall && (
        <Banner tone="info">
          På iPhone: Åbn i Safari → Del → Føj til hjemmeskærm → åbn appen derfra for at aktivere
          push.
        </Banner>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={pushBusy} onClick={() => void enablePush()}>
            {pushBusy ? 'Aktiverer…' : 'Aktivér push'}
          </Button>
          <Link to="/create">
            <Button variant="secondary">Ny opgave</Button>
          </Link>
        </div>
        {pushMessage && <p className="mt-3 text-sm text-slate-300">{pushMessage}</p>}
      </Card>

      <PushHealthPanel dispatchHealth={dispatchHealth} />

      {loading ? (
        <p className="text-sm text-slate-400">Indlæser opgaver…</p>
      ) : occurrences.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">Ingen åbne opgaver lige nu.</p>
        </Card>
      ) : (
        occurrences.map((occurrence) => (
          <OccurrenceRow
            key={occurrence.id}
            occurrence={occurrence}
            title={templateTitle(occurrence.templateId, templates)}
            highlighted={occurrence.id === highlightId}
            onComplete={completeOccurrence}
            completing={completing}
          />
        ))
      )}
    </AppShell>
  );
}
