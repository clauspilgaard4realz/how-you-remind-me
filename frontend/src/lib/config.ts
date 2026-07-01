export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
export const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';
export const allowedUid = (import.meta.env.VITE_ALLOWED_UID ?? '').trim();

export function assertClientConfig(): void {
  const required = [
    ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
    ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
    ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
    ['VITE_VAPID_PUBLIC_KEY', vapidPublicKey],
    ['VITE_ALLOWED_UID', allowedUid],
  ] as const;

  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    console.warn(`Missing env: ${missing.join(', ')}`);
  }
}
