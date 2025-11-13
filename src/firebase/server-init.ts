import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Returns a memoized instance of the Firestore database.
 * Initializes the Firebase Admin app if it hasn't been initialized yet.
 * This function is designed to be safely called from server-side code (e.g., Server Actions).
 */
export function getDb(): admin.firestore.Firestore {
  // Check if the app is already initialized to prevent re-initialization
  if (!admin.apps.length) {
    // In a serverless environment (like Firebase App Hosting),
    // initializeApp() without arguments will use the default service account credentials.
    admin.initializeApp();
  }
  // Return the Firestore service instance
  return getFirestore();
}
