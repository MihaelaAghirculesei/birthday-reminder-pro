import { TestBed } from '@angular/core/testing';
import { type Scope } from '@sentry/browser';

import { environment } from '../../../environments/environment';
import { type ErrorReport, ErrorReportingService } from './error-reporting.service';
import { type SentryClient, SentryClientHolder, SentryReporterService } from './sentry-reporter.service';

describe('SentryReporterService', () => {
  let service: SentryReporterService;
  let idbReporterMock: jasmine.SpyObj<ErrorReportingService>;
  let sentryClientMock: jasmine.SpyObj<SentryClient>;

  const mockReport: ErrorReport = {
    error: new Error('test error'),
    type: 'Unknown',
    technicalMessage: 'test error',
    timestamp: Date.now(),
    url: 'http://localhost/test'
  };

  beforeEach(() => {
    idbReporterMock  = jasmine.createSpyObj('ErrorReportingService', ['captureError']);
    sentryClientMock = jasmine.createSpyObj('SentryClient', ['captureException', 'withScope']);

    (sentryClientMock.withScope as jasmine.Spy).and.callFake((cb: (scope: Scope) => void) => {
      const mockScope = jasmine.createSpyObj<Scope>('Scope', ['setTag', 'setExtra']);
      cb(mockScope);
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
    (environment as { sentryDsn: string }).sentryDsn = '';
  });

  it('should always persist to IndexedDB', () => {
    service.captureError(mockReport);
    expect(idbReporterMock.captureError).toHaveBeenCalledWith(mockReport);
  });

  it('should NOT call Sentry when sentryDsn is empty', () => {
    (environment as { sentryDsn: string }).sentryDsn = '';

    service.captureError(mockReport);

    expect(sentryClientMock.withScope).not.toHaveBeenCalled();
  });

  it('should NOT call Sentry when the SentryClientHolder has no client yet', () => {
    (environment as { sentryDsn: string }).sentryDsn = 'https://fake@sentry.io/123';

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
    (environment as { sentryDsn: string }).sentryDsn = 'https://fake@sentry.io/123';

    service.captureError(mockReport);

    expect(sentryClientMock.withScope).toHaveBeenCalled();
    expect(sentryClientMock.captureException).toHaveBeenCalledWith(mockReport.error);
  });

  it('should set errorType tag and technicalMessage extra on the Sentry scope', () => {
    (environment as { sentryDsn: string }).sentryDsn = 'https://fake@sentry.io/123';

    let capturedScope: jasmine.SpyObj<Scope> | null = null;
    (sentryClientMock.withScope as jasmine.Spy).and.callFake((cb: (scope: Scope) => void) => {
      capturedScope = jasmine.createSpyObj<Scope>('Scope', ['setTag', 'setExtra']);
      cb(capturedScope);
    });

    service.captureError({ ...mockReport, type: 'IndexedDB' });

    expect(capturedScope!.setTag).toHaveBeenCalledWith('errorType', 'IndexedDB');
    expect(capturedScope!.setExtra).toHaveBeenCalledWith('technicalMessage', mockReport.technicalMessage);
  });

  it('should wrap non-Error values in a new Error before sending to Sentry', () => {
    (environment as { sentryDsn: string }).sentryDsn = 'https://fake@sentry.io/123';

    const nonErrorReport: ErrorReport = { ...mockReport, error: { code: 500 } };
    service.captureError(nonErrorReport);

    const captured = sentryClientMock.captureException.calls.first().args[0];
    expect(captured instanceof Error).toBeTrue();
    expect((captured as Error).message).toBe(nonErrorReport.technicalMessage);
  });

  it('should not set url extra when report has no url', () => {
    (environment as { sentryDsn: string }).sentryDsn = 'https://fake@sentry.io/123';

    let capturedScope: jasmine.SpyObj<Scope> | null = null;
    (sentryClientMock.withScope as jasmine.Spy).and.callFake((cb: (scope: Scope) => void) => {
      capturedScope = jasmine.createSpyObj<Scope>('Scope', ['setTag', 'setExtra']);
      cb(capturedScope);
    });

    service.captureError({ ...mockReport, url: undefined });

    const urlCalls = (capturedScope!.setExtra.calls.all() as jasmine.CallInfo<jasmine.Func>[])
      .filter(c => c.args[0] === 'url');
    expect(urlCalls.length).toBe(0);
  });
});
