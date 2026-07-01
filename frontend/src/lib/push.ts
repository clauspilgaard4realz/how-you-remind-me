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

async function pushSubscribeOptions(): Promise<PushSubscriptionOptionsInit> {
  return {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  };
}

export async function getPushPermissionState(): Promise<PermissionState | 'unsupported'> {
  if (!pushSupportedInContext()) return 'unsupported';
  try {
    const registration = await getServiceWorkerRegistration();
    return registration.pushManager.permissionState(await pushSubscribeOptions());
  } catch {
    return 'unsupported';
  }
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const registration = await getServiceWorkerRegistration();
  const options = await pushSubscribeOptions();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe(options);
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (subscription) await subscription.unsubscribe();
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupportedInContext()) return null;
  if (!navigator.serviceWorker.controller && !(await navigator.serviceWorker.getRegistration())) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export type PushHealthState = {
  notificationPermission: NotificationPermission | 'unsupported';
  pushPermissionState: PermissionState | 'unsupported';
  hasSubscription: boolean;
  hasServiceWorker: boolean;
  isStandalone: boolean;
  supported: boolean;
  /** True when subscription exists but OS permission looks wrong — common iOS bug. */
  permissionMismatch: boolean;
};

export async function getPushHealthState(): Promise<PushHealthState> {
  const supported = pushSupportedInContext();
  if (!supported) {
    return {
      notificationPermission: 'unsupported',
      pushPermissionState: 'unsupported',
      hasSubscription: false,
      hasServiceWorker: false,
      isStandalone: isStandalonePwa(),
      supported: false,
      permissionMismatch: false,
    };
  }

  const subscription = await getExistingPushSubscription();
  const pushPermissionState = await getPushPermissionState();
  const notificationPermission = Notification.permission;
  const hasServiceWorker = Boolean(navigator.serviceWorker.controller);
  const permissionMismatch = Boolean(
    subscription &&
      (notificationPermission !== 'granted' || pushPermissionState !== 'granted')
  );

  return {
    notificationPermission,
    pushPermissionState,
    hasSubscription: Boolean(subscription),
    hasServiceWorker,
    isStandalone: isStandalonePwa(),
    supported: true,
    permissionMismatch,
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

export type PushReceivedMessage = {
  type: 'push-received';
  title: string;
  body: string;
  occurrenceId?: string;
  url?: string;
};

export function listenForPushMessages(onPush: (msg: PushReceivedMessage) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    const data = event.data as PushReceivedMessage | undefined;
    if (data?.type === 'push-received') onPush(data);
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
