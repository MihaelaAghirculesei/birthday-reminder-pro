/**
 * Environment Configuration Template (Development)
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this file to 'environment.ts' in the same directory
 * 2. Replace placeholder values with your actual credentials
 * 3. NEVER commit environment.ts to Git (it's in .gitignore)
 *
 * GOOGLE CALENDAR SETUP (Google Identity Services):
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Calendar API
 * 4. Go to "APIs & Services" > "Credentials"
 * 5. Create OAuth 2.0 credentials (Web application type)
 * 6. Add authorized JavaScript origins: http://localhost:4200
 * 7. Copy only the Client ID (API Key is no longer required with GIS)
 *
 * NOTE: This app uses Google Identity Services (GIS) for OAuth 2.0
 * authentication. The deprecated gapi.auth2 library is no longer used.
 * No API key is required for this authentication flow.
 */

export const environment = {
  production: false,
  googleCalendar: {
    // Replace with your Google OAuth 2.0 Client ID
    // Example: '123456789-abcdefghijklmnop.apps.googleusercontent.com'
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
  }
};
