import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SnoozePreset, TaskOccurrence } from '@hyrm/shared';
import { apiFetch } from '../lib/api';
import {
  getExistingPushSubscription,
  getPushHealthState,
  getPushPermissionState,
  isStandalonePwa,
  listenForPushMessages,
  subscribeToPush,
  subscriptionToJson,
  unsubscribeFromPush,
  type PushHealthState,
} from '../lib/push';
import {
  formatTodayEyebrow,
  groupOccurrences,
  occurrenceTitle,
  canIgnoreOccurrence,
} from '../lib/taskDisplay';
import { useAuth } from '../hooks/useAuth';
import { useDispatchHealth, useOpenOccurrences, useTaskTemplates } from '../hooks/useFirestoreData';
import { EmptyState } from '../components/EmptyState';
import {
  PushInstallHint,
  PushMessageBanner,
  PushStatusChip,
} from '../components/PushStatusChip';
import { SectionHeader } from '../components/SectionHeader';
import { TaskDetailSheet } from '../components/TaskDetailSheet';
import { TaskRow } from '../components/TaskRow';
import { AppShell } from '../components/ui';

export function HomePage() {
  const { getIdToken, signOutUser } = useAuth();
  const { templates } = useTaskTemplates();
  const {
    occurrences,
    loading,
    markCompletedLocally,
    unmarkCompletedLocally,
    applySnoozeLocally,
  } = useOpenOccurrences();
  const dispatchHealth = useDispatchHealth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('occurrence');
  const actionParam = searchParams.get('action');

  const [completing, setCompleting] = useState<string | null>(null);
  const [snoozing, setSnoozing] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [pushState, setPushState] = useState<PushHealthState | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<TaskOccurrence | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const templateById = (id: string) => templates.find((t) => t.id === id);

  const refreshPushHealth = useCallback(async () => {
    const state = await getPushHealthState();
    setPushState(state);
    setNeedsInstall(!state.isStandalone);
  }, []);

  useEffect(() => {
    if (import.meta.env.PROD) {
      void import('virtual:pwa-register').then(({ registerSW }) => {
        registerSW({ immediate: true });
        void refreshPushHealth();
      });
    } else {
      void refreshPushHealth();
    }
  }, [refreshPushHealth]);

  useEffect(() => {
    return listenForPushMessages((msg) => {
      setPushMessage(`Push modtaget: ${msg.title} — ${msg.body}`);
    });
  }, []);

  useEffect(() => {
    if (highlightId && occurrences.length) {
      const match = occurrences.find((o) => o.id === highlightId);
      if (match) setSelectedOccurrence(match);
    }
  }, [highlightId, occurrences]);

  const actionHandled = useRef(false);

  useEffect(() => {
    if (!actionParam || !highlightId || actionHandled.current) return;
    actionHandled.current = true;
    if (actionParam === 'complete') {
      void completeOccurrence(highlightId).finally(() => {
        setSearchParams({}, { replace: true });
      });
    } else if (actionParam === 'snooze') {
      void snoozeOccurrence(highlightId, '15m').finally(() => {
        setSearchParams({}, { replace: true });
      });
    } else if (actionParam === 'ignore') {
      void ignoreOccurrence(highlightId).finally(() => {
        setSearchParams({}, { replace: true });
      });
    }
  }, [actionParam, highlightId, setSearchParams]);

  async function enablePush() {
    setPushBusy(true);
    setPushMessage(null);
    try {
      if (!isStandalonePwa()) {
        setPushMessage('Tilføj appen til hjemmeskærmen i Safari først.');
        return;
      }

      if (import.meta.env.PROD) {
        await import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
      }
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      const pushPermission = await getPushPermissionState();

      if (permission !== 'granted' || pushPermission !== 'granted') {
        await unsubscribeFromPush();
        setPushMessage(
          'Notifikationstilladelse blev ikke givet. Du skal trykke Tillad i iOS-dialogen — ellers vises intet, selvom backend sender.'
        );
        await refreshPushHealth();
        return;
      }

      await unsubscribeFromPush();
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
      await refreshPushHealth();
      setPushMessage('Push er aktiveret. Luk appen og vent på næste 15-min slot for at teste banner.');
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : 'Push-aktivering fejlede');
      await refreshPushHealth();
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

  async function snoozeOccurrence(id: string, preset: SnoozePreset, customAt?: string) {
    const occurrence = occurrences.find((o) => o.id === id);
    setSnoozing(id);
    try {
      const token = await getIdToken();
      const result = await apiFetch<{ snoozedUntil: string }>(`/api/occurrences/${id}/snooze`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          preset,
          customAt,
          ...(preset === 'tomorrow' && occurrence
            ? { scheduledLocalTime: occurrence.scheduledLocalTime }
            : {}),
        }),
      });
      applySnoozeLocally(id, result.snoozedUntil);
      if (selectedOccurrence?.id === id) {
        setSelectedOccurrence((prev) =>
          prev ? { ...prev, status: 'snoozed', snoozedUntil: result.snoozedUntil } : prev
        );
      }
    } finally {
      setSnoozing(null);
    }
  }

  async function ignoreOccurrence(id: string) {
    markCompletedLocally(id);
    setCompleting(id);
    try {
      const token = await getIdToken();
      await apiFetch(`/api/occurrences/${id}/ignore`, {
        method: 'POST',
        token,
      });
      if (selectedOccurrence?.id === id) {
        setSelectedOccurrence(null);
        setDeleteConfirm(false);
      }
    } catch (err) {
      unmarkCompletedLocally(id);
      throw err;
    } finally {
      setCompleting(null);
    }
  }

  async function completeOccurrence(id: string) {
    markCompletedLocally(id);
    setCompleting(id);
    try {
      const token = await getIdToken();
      await apiFetch(`/api/occurrences/${id}/complete`, {
        method: 'POST',
        token,
      });
      if (selectedOccurrence?.id === id) {
        setSelectedOccurrence(null);
        setDeleteConfirm(false);
      }
    } catch (err) {
      unmarkCompletedLocally(id);
      throw err;
    } finally {
      setCompleting(null);
    }
  }

  async function deleteSelectedOccurrence(scope: 'instance' | 'series') {
    if (!selectedOccurrence) return;
    setCompleting(selectedOccurrence.id);
    try {
      const token = await getIdToken();
      if (scope === 'series') {
        await apiFetch(`/api/tasks/${selectedOccurrence.templateId}`, {
          method: 'DELETE',
          token,
        });
      } else {
        await apiFetch(`/api/occurrences/${selectedOccurrence.id}`, {
          method: 'DELETE',
          token,
        });
      }
      markCompletedLocally(selectedOccurrence.id);
      setSelectedOccurrence(null);
      setDeleteConfirm(false);
    } finally {
      setCompleting(null);
    }
  }

  const groups = groupOccurrences(occurrences);
  const selectedTitle = selectedOccurrence
    ? occurrenceTitle(selectedOccurrence, templates)
    : '';

  return (
    <AppShell
      eyebrow={formatTodayEyebrow()}
      title="I dag"
      hideHeader={false}
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/create"
            className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-hyrm-accent text-[26px] font-bold leading-none text-hyrm-bg"
            aria-label="Ny opgave"
          >
            +
          </Link>
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="flex min-h-11 min-w-11 items-center justify-end text-[12px] font-semibold text-hyrm-muted-dim"
          >
            Log ud
          </button>
        </div>
      }
    >
      <PushInstallHint visible={needsInstall} />
      <PushStatusChip
        dispatchHealth={dispatchHealth}
        pushState={pushState}
        onEnablePush={() => void enablePush()}
        pushBusy={pushBusy}
      />
      <PushMessageBanner message={pushMessage} />

      {loading ? (
        <p className="text-sm text-hyrm-muted">Indlæser opgaver…</p>
      ) : occurrences.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.section}>
              <SectionHeader
                label={group.label}
                count={group.showCount ? group.items.length : undefined}
                danger={group.section === 'overdue'}
              />
              {group.items.map((occurrence) => (
                <TaskRow
                  key={occurrence.id}
                  occurrence={occurrence}
                  title={occurrenceTitle(occurrence, templates)}
                  template={templateById(occurrence.templateId)}
                  overdue={group.section === 'overdue'}
                  expanded={group.section === 'overdue'}
                  highlighted={occurrence.id === highlightId}
                  showDate={group.section === 'later'}
                  completing={completing === occurrence.id}
                  snoozing={snoozing === occurrence.id}
                  onOpen={() => setSelectedOccurrence(occurrence)}
                  onComplete={() => void completeOccurrence(occurrence.id)}
                  onIgnore={
                    canIgnoreOccurrence(occurrence, templateById(occurrence.templateId))
                      ? () => void ignoreOccurrence(occurrence.id)
                      : undefined
                  }
                  onSnooze={(preset, customAt) =>
                    snoozeOccurrence(occurrence.id, preset, customAt)
                  }
                />
              ))}
            </section>
          ))}
        </div>
      )}

      <TaskDetailSheet
        occurrence={selectedOccurrence}
        title={selectedTitle}
        template={
          selectedOccurrence ? templateById(selectedOccurrence.templateId) : undefined
        }
        open={Boolean(selectedOccurrence) && !deleteConfirm}
        busy={completing === selectedOccurrence?.id}
        onClose={() => {
          setSelectedOccurrence(null);
          setDeleteConfirm(false);
        }}
        onComplete={() =>
          selectedOccurrence && void completeOccurrence(selectedOccurrence.id)
        }
        onIgnore={
          selectedOccurrence &&
          canIgnoreOccurrence(selectedOccurrence, templateById(selectedOccurrence.templateId))
            ? () => void ignoreOccurrence(selectedOccurrence.id)
            : undefined
        }
        onDelete={() => setDeleteConfirm(true)}
      />

      {deleteConfirm && selectedOccurrence && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(6,5,9,0.72)] p-4">
          <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-hyrm-sheet p-5">
            <h3 className="font-display text-lg font-bold text-hyrm-text">Slet opgave?</h3>
            <p className="mt-2 text-sm text-hyrm-muted">
              Vælg om du vil slette kun denne forekomst eller hele serien.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                className="h-11 w-full rounded-[var(--radius-btn)] bg-hyrm-elevated text-sm font-semibold text-hyrm-text"
                onClick={() => void deleteSelectedOccurrence('instance')}
              >
                Slet denne
              </button>
              <button
                type="button"
                className="h-11 w-full rounded-[var(--radius-btn)] border border-hyrm-danger/40 text-sm font-semibold text-hyrm-danger"
                onClick={() => void deleteSelectedOccurrence('series')}
              >
                Slet hele serien
              </button>
              <button
                type="button"
                className="h-11 w-full text-sm font-semibold text-hyrm-muted"
                onClick={() => setDeleteConfirm(false)}
              >
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
