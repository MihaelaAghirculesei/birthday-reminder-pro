import { TestBed } from '@angular/core/testing';
import { FirebaseAuthService } from './firebase-auth.service';
import { LoggerService } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { environment } from '../../../environments/environment';

describe('FirebaseAuthService', () => {
  let service: FirebaseAuthService;
  let loggerMock: jasmine.SpyObj<LoggerService>;
  const originalFirebase = environment.firebase;

  beforeEach(() => {
    // Force isFirebaseConfigured() to return false — no real Firebase calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).firebase = undefined;

    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: loggerMock },
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(FirebaseAuthService);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).firebase = originalFirebase;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should initially have null user', () => {
    expect(service.currentUser).toBeNull();
  });

  it('should initially not be authenticated', () => {
    expect(service.isAuthenticated).toBeFalse();
  });

  it('should emit null from user$', (done) => {
    service.user$.subscribe((user) => {
      expect(user).toBeNull();
      done();
    });
  });

  it('should emit true from loading$ initially', (done) => {
    service.loading$.subscribe((loading) => {
      expect(loading).toBeTrue();
      done();
    });
  });

  it('should clean up on destroy', () => {
    service.destroy();
    expect(service).toBeTruthy();
  });

  it('user$ should be an observable', () => {
    expect(service.user$).toBeTruthy();
    expect(service.user$.subscribe).toBeDefined();
  });

  it('loading$ should be an observable', () => {
    expect(service.loading$).toBeTruthy();
    expect(service.loading$.subscribe).toBeDefined();
  });
});
