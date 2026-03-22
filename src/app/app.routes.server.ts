import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Routes that require auth or external APIs must be rendered client-side only.
  // SSR prerendering cannot resolve auth state or Google Calendar API calls.
  { path: 'scheduled-messages', renderMode: RenderMode.Client },
  // { path: 'calendar-sync', renderMode: RenderMode.Client }, // disabled pending Google OAuth verification
  // All other routes are prerendered at build time.
  { path: '**', renderMode: RenderMode.Prerender }
];
