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

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload = {};
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title ?? 'How You Remind Me';
  const options: NotificationOptions = {
    body: payload.body ?? 'Du har en reminder',
    tag: payload.tag ?? payload.occurrenceId,
    data: {
      url: payload.url ?? '/',
      occurrenceId: payload.occurrenceId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
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
