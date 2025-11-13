import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

let db: admin.firestore.Firestore;

function initializeAdminApp() {
  // Ensure the app is only initialized once
  if (!admin.apps.length) {
    // In a serverless environment (like Firebase App Hosting or Cloud Functions),
    // initializeApp() without arguments will use the default service account.
    // For local development, you might need to set GOOGLE_APPLICATION_CREDENTIALS.
    try {
      admin.initializeApp();
    } catch (e) {
      console.error("Failed to initialize firebase-admin", e);
    }
  }
  db = getFirestore();
}

export function getDb() {
  if (!db) {
    initializeAdminApp();
  }
  return db;
}
