import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

// Ensure the app is only initialized once
if (!admin.apps.length) {
  // In a serverless environment (like Firebase App Hosting or Cloud Functions),
  // initializeApp() without arguments will use the default service account.
  // For local development, you might need to set GOOGLE_APPLICATION_CREDENTIALS.
  admin.initializeApp();
}

const db = getFirestore();

export function getDb() {
  return db;
}
