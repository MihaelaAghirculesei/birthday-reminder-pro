import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * Static kill-switches read from environment.ts/environment.prod.ts.
 * Flip a flag to false and redeploy to disable a sync path during a Firebase/
 * Google API incident, without shipping a code change.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  isCloudSyncEnabled(): boolean {
    return environment.featureFlags.cloudSyncEnabled;
  }

  isCalendarSyncEnabled(): boolean {
    return environment.featureFlags.calendarSyncEnabled;
  }
}
