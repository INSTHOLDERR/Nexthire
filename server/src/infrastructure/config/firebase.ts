import admin from 'firebase-admin';


export function getFirebaseAdmin(): typeof admin {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      throw new Error(
        'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, ' +
          'and FIREBASE_CLIENT_EMAIL in .env to use Google sign-in.'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
    });
  }

  return admin;
}

export default admin;
