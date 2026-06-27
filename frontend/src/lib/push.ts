import { vapidPublicKey } from './config';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function pushSupportedInContext(): boolean {
  return 'PushManager' in window && 'Notification' in window;
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.ready;
  return registration;
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const registration = await getServiceWorkerRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupportedInContext()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export type PushHealthState = {
  permission: NotificationPermission | 'unsupported';
  hasSubscription: boolean;
  isStandalone: boolean;
  supported: boolean;
};

export async function getPushHealthState(): Promise<PushHealthState> {
  const supported = pushSupportedInContext();
  if (!supported) {
    return {
      permission: 'unsupported',
      hasSubscription: false,
      isStandalone: isStandalonePwa(),
      supported: false,
    };
  }

  const subscription = await getExistingPushSubscription();
  return {
    permission: Notification.permission,
    hasSubscription: Boolean(subscription),
    isStandalone: isStandalonePwa(),
    supported: true,
  };
}

export function subscriptionToJson(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!,
    },
  };
}
