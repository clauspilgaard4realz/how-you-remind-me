import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

export function getFirebaseApp(): App {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0]!;
    } else {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID;
      initializeApp(projectId ? { projectId } : undefined);
      app = getApps()[0]!;
    }
  }
  return app;
}

export function getDb() {
  return getFirestore(getFirebaseApp());
}
