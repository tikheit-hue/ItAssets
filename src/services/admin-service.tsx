
'use server';

import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';

// This is a singleton to ensure we only initialize the admin app once.
let adminApp: App | null = null;

function initializeAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // When running locally, these env vars need to be set.
  // When deployed on App Hosting, they are provided automatically.
  const serviceAccount: ServiceAccount = {
    projectId: process.env.PROJECT_ID!,
    clientEmail: process.env.CLIENT_EMAIL!,
    // The private key must be parsed to handle newline characters.
    privateKey: (process.env.PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error("Firebase Admin SDK environment variables are not set. Cannot initialize admin app.");
      throw new Error("Server configuration error: Firebase Admin credentials are not set.");
  }

  // Use a unique name for the app to avoid conflicts.
  const appName = 'firebase-admin-app-e192f1f3'; // Unique name
  const existingApp = getApps().find(app => app.name === appName);
  
  if (existingApp) {
    adminApp = existingApp;
  } else {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    }, appName);
  }

  return adminApp;
}


/**
 * Creates a new user in Firebase Authentication. This is a privileged operation
 * and must only be called from a trusted server environment.
 */
export async function createUser(email: string, password?: string, displayName?: string): Promise<{ success: boolean; uid: string; message: string }> {
  try {
    initializeAdminApp();
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
    });
    return {
      success: true,
      uid: userRecord.uid,
      message: 'User created successfully.',
    };
  } catch (error: any) {
    console.error("Error creating user (admin-service):", error);
    let message = 'An unexpected error occurred. Please check server logs.';
    if (error.code === 'auth/email-already-exists') {
      message = 'The email address is already in use by another account.';
    } else if (error.code === 'auth/invalid-password') {
      message = 'The password must be a string with at least six characters.';
    }
    return {
      success: false,
      uid: '',
      message: message,
    };
  }
}


export async function updateUserPassword(uid: string, newPassword: string):Promise<{success: boolean, message: string}> {
    try {
        initializeAdminApp();
        await getAuth().updateUser(uid, { password: newPassword });
        return {
            success: true,
            message: `Password for user has been reset successfully.`
        }
    } catch (error: any) {
        console.error("Error updating user password (admin-service):", error);
        return { success: false, message: error.message || "Failed to update password." };
    }
}

export async function sendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
      initializeAdminApp();
      await getAuth().generatePasswordResetLink(email);
      return {
        success: true,
        message: `A password reset link has been generated for ${email}. (Email sending not implemented).`,
      };
  } catch (error: any) {
    console.error("Error sending password reset (admin-service):", error);
    return { success: false, message: error.message || "Failed to generate password reset link." };
  }
}
