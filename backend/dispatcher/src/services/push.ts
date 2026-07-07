import webPush from 'web-push';
import type { NagCadence, PushDevice, TaskOccurrence, TaskTemplate } from '@hyrm/shared';
import {
  canIgnoreDeadlineOccurrence,
  isDeadlineSchedule,
  resolveTemplateNag,
  resolveTemplateSchedule,
} from '@hyrm/shared';

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
  payload: {
    title: string;
    body: string;
    tag: string;
    url: string;
    occurrenceId: string;
    recurrence?: string;
    canIgnore?: boolean;
    primaryAction?: 'ignore' | 'complete';
    secondaryAction?: 'complete' | 'snooze';
  }
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

function nagBodyText(cadence: NagCadence, isDeadline = false, canIgnore = false): string {
  if (isDeadline && canIgnore) {
    return 'Deadline-påmindelse — ignorer for i dag eller marker som klaret.';
  }
  if (isDeadline) {
    return 'Deadline overskredet — marker som klaret, når du er færdig.';
  }
  switch (cadence) {
    case '15m':
      return 'Jeg nagger hvert 15. min, til du markerer den som klaret.';
    case '1h':
      return 'Jeg nagger hver time, til du markerer den som klaret.';
    case 'daily':
      return 'Påmindelse — marker den som klaret, når du er færdig.';
    default:
      return 'Påmindelse — tryk for at åbne';
  }
}

export function buildPushPayload(
  occurrence: TaskOccurrence,
  template: TaskTemplate
): {
  title: string;
  body: string;
  tag: string;
  url: string;
  occurrenceId: string;
  recurrence: string;
  canIgnore: boolean;
  primaryAction: 'ignore' | 'complete';
  secondaryAction?: 'complete' | 'snooze';
} {
  const nag = resolveTemplateNag(template);
  const schedule = resolveTemplateSchedule(template);
  const isDeadline = schedule ? isDeadlineSchedule(schedule) : false;
  const canIgnore = schedule
    ? canIgnoreDeadlineOccurrence(schedule, occurrence.scheduledLocalDate)
    : false;

  return {
    title: template.title,
    body: nagBodyText(nag.cadence, isDeadline, canIgnore),
    tag: occurrence.id,
    url: `/?occurrence=${occurrence.id}`,
    occurrenceId: occurrence.id,
    recurrence: schedule?.recurrence ?? 'once',
    canIgnore,
    primaryAction: canIgnore ? 'ignore' : 'complete',
    secondaryAction: canIgnore ? 'complete' : 'snooze',
  };
}
