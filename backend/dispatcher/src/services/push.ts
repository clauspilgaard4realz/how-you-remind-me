import webPush from 'web-push';
import type { PushDevice, TaskOccurrence, TaskTemplate } from '@hyrm/shared';

let configured = false;

export function configureWebPush(): void {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:reminders@replaymaker.dk';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured');
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendPushToDevices(
  devices: PushDevice[],
  payload: { title: string; body: string; tag: string; url: string; occurrenceId: string }
): Promise<Array<{ deviceId: string; ok: boolean; statusCode?: number; error?: string }>> {
  configureWebPush();
  const body = JSON.stringify(payload);

  return Promise.all(
    devices.map(async (device) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: device.endpoint,
            keys: device.keys,
          },
          body,
          {
            TTL: 3600,
            topic: payload.occurrenceId.slice(0, 32),
          }
        );
        return { deviceId: device.id, ok: true, statusCode: 201 };
      } catch (err) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : undefined;
        const message = err instanceof Error ? err.message : 'Push failed';
        return { deviceId: device.id, ok: false, statusCode, error: message };
      }
    })
  );
}

export function buildPushPayload(
  occurrence: TaskOccurrence,
  template: TaskTemplate
): { title: string; body: string; tag: string; url: string; occurrenceId: string } {
  return {
    title: template.title,
    body: 'Påmindelse — tryk for at åbne',
    tag: occurrence.id,
    url: `/?occurrence=${occurrence.id}`,
    occurrenceId: occurrence.id,
  };
}
