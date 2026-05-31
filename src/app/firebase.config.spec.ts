import type { FirebaseOptions } from 'firebase/app';

import { environment } from '../environments/environment';
import { checkFirebaseOptions, isFirebaseConfigured } from './firebase.config';

describe('checkFirebaseOptions', () => {
  it('returns false when opts is undefined', () => {
    expect(checkFirebaseOptions(undefined)).toBeFalse();
  });

  it('returns false when opts is an empty object', () => {
    expect(checkFirebaseOptions({} as FirebaseOptions)).toBeFalse();
  });

  it('returns false when apiKey is a placeholder', () => {
    expect(checkFirebaseOptions({ apiKey: 'YOUR_API_KEY', projectId: 'real-project' })).toBeFalse();
  });

  it('returns false when projectId is a placeholder', () => {
    expect(checkFirebaseOptions({ apiKey: 'AIzaSyReal', projectId: 'YOUR_PROJECT_ID' })).toBeFalse();
  });

  it('returns false when apiKey starts with YOUR_ and projectId also starts with YOUR_', () => {
    expect(checkFirebaseOptions({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' })).toBeFalse();
  });

  it('returns false when apiKey is missing but projectId is real', () => {
    expect(checkFirebaseOptions({ projectId: 'real-project' } as FirebaseOptions)).toBeFalse();
  });

  it('returns false when projectId is missing but apiKey is real', () => {
    expect(checkFirebaseOptions({ apiKey: 'AIzaSyReal' } as FirebaseOptions)).toBeFalse();
  });

  it('returns true when both apiKey and projectId are non-placeholder strings', () => {
    expect(checkFirebaseOptions({ apiKey: 'AIzaSyReal', projectId: 'real-project' })).toBeTrue();
  });
});

describe('isFirebaseConfigured', () => {
  it('is consistent with checkFirebaseOptions(environment.firebase)', () => {
    // isFirebaseConfigured() is a thin wrapper — its output must always match
    // checkFirebaseOptions applied to the same config object.
    // We do NOT assume real credentials are present (CI uses placeholder env).
    expect(isFirebaseConfigured()).toBe(checkFirebaseOptions(environment.firebase));
  });
});
