import '../loadEnv.js';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

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
  if (!db) {
    db = getFirestore(getFirebaseApp());
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}

export function getAdminAuth() {
  return getAuth(getFirebaseApp());
}

export { cert };
