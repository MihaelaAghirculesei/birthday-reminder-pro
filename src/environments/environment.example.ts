/**
 * Copy to environment.ts and replace placeholders with real credentials.
 * With placeholders the app runs in offline/demo mode.
 * See: https://console.cloud.google.com/ (Google Calendar)
 * See: https://console.firebase.google.com/ (Firebase)
 */

export const environment = {
  production: false,
  googleCalendar: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
  },
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
  }
};
