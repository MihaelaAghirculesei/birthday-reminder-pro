import { TestBed } from '@angular/core/testing';
import { type Scope } from '@sentry/browser';
import type { Mock, MockedObject } from 'vitest';

import { environment } from '../../../environments/environment';
import { type ErrorReport, ErrorReportingService } from './error-reporting.service';
import { type SentryClient, SentryClientHolder, SentryReporterService } from './sentry-reporter.service';

describe('SentryReporterService', () => {
  let service: SentryReporterService;
  let idbReporterMock: MockedObject<ErrorReportingService>;
  let sentryClientMock: MockedObject<SentryClient>;

  const mockReport: ErrorReport = {
    error: new Error('test error'),
    type: 'Unknown',
    technicalMessage: 'test error',
    timestamp: Date.now(),
    url: 'http://localhost/test'
  };

  beforeEach(() => {
    idbReporterMock = {
      captureError: vi.fn().mockName('ErrorReportingService.captureError')
    } as unknown as MockedObject<ErrorReportingService>;
    sentryClientMock = {
      captureException: vi.fn().mockName('SentryClient.captureException'),
      withScope: vi.fn().mockName('SentryClient.withScope')
    };

    (sentryClientMock.withScope as Mock).mockImplementation((cb: (scope: Scope) => void) => {
      const mockScope = {
        setTag: vi.fn().mockName('Scope.setTag'),
        setExtra: vi.fn().mockName('Scope.setExtra')
      };
      cb(mockScope as unknown as Scope);
    });

    TestBed.configureTestingModule({
      providers: [
        SentryReporterService,
        { provide: ErrorReportingService, useValue: idbReporterMock },
        { provide: SentryClientHolder, useValue: { client: sentryClientMock } }
      ]
    });

    service = TestBed.inject(SentryReporterService);
  });

  afterEach(() => {
    (environment as {
      sentryDsn: string;
    }).sentryDsn = '';
  });

  it('should always persist to IndexedDB', () => {
    service.captureError(mockReport);
    expect(idbReporterMock.captureError).toHaveBeenCalledWith(mockReport);
  });

  it('should NOT call Sentry when sentryDsn is empty', () => {
    (environment as {
      sentryDsn: string;
    }).sentryDsn = '';

    service.captureError(mockReport);

    expect(sentryClientMock.withScope).not.toHaveBeenCalled();
  });

  it('should NOT call Sentry when the SentryClientHolder has no client yet', () => {
    (environment as {
      sentryDsn: string;
    }).sentryDsn = 'https://fake@sentry.io/123';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SentryReporterService,
        { provide: ErrorReportingService, useValue: idbReporterMock },
        // SentryClientHolder intentionally omitted — defaults to `client: null`,
        // simulating the window between bootstrap and the Sentry chunk loading.
      ]
    });
    const serviceWithoutSentry = TestBed.inject(SentryReporterService);

    serviceWithoutSentry.captureError(mockReport);

    expect(sentryClientMock.withScope).not.toHaveBeenCalled();
    expect(idbReporterMock.captureError).toHaveBeenCalledWith(mockReport);
  });

  it('should call Sentry.captureException when sentryDsn is set', () => {
    (environment as {
      sentryDsn: string;
    }).sentryDsn = 'https://fake@sentry.io/123';

    service.captureError(mockReport);

    expect(sentryClientMock.withScope).toHaveBeenCalled();
    expect(sentryClientMock.captureException).toHaveBeenCalledWith(mockReport.error);
  });

  it('should set errorType tag and technicalMessage extra on the Sentry scope', () => {
    (environment as {
      sentryDsn: string;
    }).sentryDsn = 'https://fake@sentry.io/123';

    let capturedScope: MockedObject<Scope> | null = null;
    (sentryClientMock.withScope as Mock).mockImplementation((cb: (scope: Scope) => void) => {
      capturedScope = {
        setTag: vi.fn().mockName('Scope.setTag'),
        setExtra: vi.fn().mockName('Scope.setExtra')
      } as unknown as MockedObject<Scope> | null;
      cb(capturedScope as unknown as Scope);
    });

    service.captureError({ ...mockReport, type: 'IndexedDB' });

    expect(capturedScope!.setTag).toHaveBeenCalledWith('errorType', 'IndexedDB');
    expect(capturedScope!.setExtra).toHaveBeenCalledWith('technicalMessage', mockReport.technicalMessage);
  });

  it('should wrap non-Error values in a new Error before sending to Sentry', () => {
    (environment as {
      sentryDsn: string;
    }).sentryDsn = 'https://fake@sentry.io/123';

    const nonErrorReport: ErrorReport = { ...mockReport, error: { code: 500 } };
    service.captureError(nonErrorReport);

    const captured = vi.mocked(sentryClientMock.captureException).mock.calls[0][0];
    expect(captured instanceof Error).toBe(true);
    expect((captured as Error).message).toBe(nonErrorReport.technicalMessage);
  });

  it('should not set url extra when report has no url', () => {
    (environment as {
      sentryDsn: string;
    }).sentryDsn = 'https://fake@sentry.io/123';

    let capturedScope: MockedObject<Scope> | null = null;
    (sentryClientMock.withScope as Mock).mockImplementation((cb: (scope: Scope) => void) => {
      capturedScope = {
        setTag: vi.fn().mockName('Scope.setTag'),
        setExtra: vi.fn().mockName('Scope.setExtra')
      } as unknown as MockedObject<Scope> | null;
      cb(capturedScope as unknown as Scope);
    });

    service.captureError({ ...mockReport, url: undefined });

    const urlCalls = vi.mocked(capturedScope!.setExtra).mock.calls
      .filter(c => c[0] === 'url');
    expect(urlCalls.length).toBe(0);
  });
});
