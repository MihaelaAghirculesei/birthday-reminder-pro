import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let originalFlags: typeof environment.featureFlags;

  beforeEach(() => {
    originalFlags = { ...environment.featureFlags };
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeatureFlagsService);
  });

  afterEach(() => {
    environment.featureFlags = originalFlags;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('isCloudSyncEnabled reflects environment.featureFlags.cloudSyncEnabled', () => {
    environment.featureFlags.cloudSyncEnabled = true;
    expect(service.isCloudSyncEnabled()).toBe(true);

    environment.featureFlags.cloudSyncEnabled = false;
    expect(service.isCloudSyncEnabled()).toBe(false);
  });

  it('isCalendarSyncEnabled reflects environment.featureFlags.calendarSyncEnabled', () => {
    environment.featureFlags.calendarSyncEnabled = true;
    expect(service.isCalendarSyncEnabled()).toBe(true);

    environment.featureFlags.calendarSyncEnabled = false;
    expect(service.isCalendarSyncEnabled()).toBe(false);
  });
});
