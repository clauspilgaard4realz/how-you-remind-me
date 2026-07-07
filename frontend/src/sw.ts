/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

interface PushPayload {
  title?: string;
  body?: string;
  tag?: string;
  url?: string;
  occurrenceId?: string;
  canIgnore?: boolean;
  primaryAction?: 'ignore' | 'complete';
  secondaryAction?: 'complete' | 'snooze';
}

function buildNotificationActions(
  payload: PushPayload
): { action: string; title: string }[] {
  if (payload.canIgnore) {
    return [
      { action: 'ignore', title: 'Ignorer' },
      { action: 'complete', title: 'Klaret' },
    ];
  }
  return [
    { action: 'complete', title: 'Klaret' },
    { action: 'snooze', title: 'Udsæt 15 min' },
  ];
}

async function notifyClients(payload: PushPayload, title: string, body: string): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({
      type: 'push-received',
      title,
      body,
      occurrenceId: payload.occurrenceId,
      url: payload.url,
    });
  }
}

function targetUrl(payload: PushPayload, action?: string): string {
  const base = payload.url ?? '/';
  if (!payload.occurrenceId) return base;
  const params = new URLSearchParams({ occurrence: payload.occurrenceId });
  if (action === 'complete') params.set('action', 'complete');
  if (action === 'snooze') params.set('action', 'snooze');
  if (action === 'ignore') params.set('action', 'ignore');
  return `/?${params.toString()}`;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload = {};
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title ?? 'How You Remind Me';
  const body = payload.body ?? 'Du har en påmindelse';
  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-32.png',
    tag: payload.tag ?? payload.occurrenceId,
    data: {
      url: payload.url ?? '/',
      occurrenceId: payload.occurrenceId,
      canIgnore: payload.canIgnore,
    },
    actions: buildNotificationActions(payload),
  } as NotificationOptions;

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      notifyClients(payload, title, body),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string; occurrenceId?: string } | undefined;
  const action = event.action;
  const payload: PushPayload = {
    url: data?.url,
    occurrenceId: data?.occurrenceId,
  };
  const navigateTo = targetUrl(payload, action || undefined);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          void client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            void client.navigate(navigateTo);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        void self.clients.openWindow(navigateTo);
      }
    })
  );
});
