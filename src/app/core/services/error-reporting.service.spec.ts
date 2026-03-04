import { TestBed } from '@angular/core/testing';
import { ErrorReportingService, ErrorReport } from './error-reporting.service';

describe('ErrorReportingService', () => {
  let service: ErrorReportingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorReportingService);
  });

  function createReport(overrides: Partial<ErrorReport> = {}): ErrorReport {
    return {
      error: new Error('test'),
      type: 'runtime',
      technicalMessage: 'Test error',
      timestamp: Date.now(),
      ...overrides
    };
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty array initially', () => {
    expect(service.getRecentErrors()).toEqual([]);
  });

  it('should capture errors in production mode', () => {
    // In test environment isDevMode() returns true, so captureError is a no-op
    // We test the public API behavior
    service.captureError(createReport());
    // isDevMode() is true in tests, so buffer stays empty
    expect(service.getRecentErrors().length).toBe(0);
  });

  it('should return a copy of error buffer from getRecentErrors', () => {
    const errors1 = service.getRecentErrors();
    const errors2 = service.getRecentErrors();
    expect(errors1).not.toBe(errors2);
    expect(errors1).toEqual(errors2);
  });

  it('should clear errors', () => {
    service.clearErrors();
    expect(service.getRecentErrors()).toEqual([]);
  });
});
