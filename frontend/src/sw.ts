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

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload = {};
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title ?? 'How You Remind Me';
  const body = payload.body ?? 'Du har en reminder';
  const options: NotificationOptions = {
    body,
    tag: payload.tag ?? payload.occurrenceId,
    data: {
      url: payload.url ?? '/',
      occurrenceId: payload.occurrenceId,
    },
  };

  // Apple: vis notifikation med det samme i SW — ellers kan tilladelse tilbagekaldes.
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
  const targetUrl = data?.occurrenceId ? `/?occurrence=${data.occurrenceId}` : data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          void client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            void client.navigate(targetUrl);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        void self.clients.openWindow(targetUrl);
      }
    })
  );
});
