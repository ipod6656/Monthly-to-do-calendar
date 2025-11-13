import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// This function ensures that the admin app is initialized only once.
function initializeAdminApp() {
  if (admin.apps.length === 0) {
    // In a serverless environment (like Firebase App Hosting or Cloud Functions),
    // initializeApp() without arguments will use the default service account credentials.
    // For local development, you would need to set up the GOOGLE_APPLICATION_CREDENTIALS
    // environment variable to point to your service account key file.
    try {
      admin.initializeApp();
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
      // We throw the error to make it clear that initialization failed.
      throw new Error(`Firebase admin initialization failed: ${error}`);
    }
  }
}

// Ensure the app is initialized before we try to get the database.
initializeAdminApp();

// Export a function to get the database instance.
export function getDb() {
  // getFirestore() can only be called after initializeApp() has completed.
  return getFirestore();
}
