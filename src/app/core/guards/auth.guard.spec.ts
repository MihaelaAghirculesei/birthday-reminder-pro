import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { MemoizedSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { authGuard } from './auth.guard';
import { selectAuthInitialized, selectIsAuthenticated } from '../store/auth/auth.selectors';

describe('authGuard', () => {
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;
  let mockInitialized: MemoizedSelector<object, boolean>;
  let mockAuthenticated: MemoizedSelector<object, boolean>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue({ toString: () => '/' } as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: Router, useValue: router },
      ],
    });

    store = TestBed.inject(MockStore);
    mockInitialized = store.overrideSelector(selectAuthInitialized, true);
    mockAuthenticated = store.overrideSelector(selectIsAuthenticated, false);
  });

  afterEach(() => store.resetSelectors());

  function runGuard() {
    return TestBed.runInInjectionContext(() => authGuard({} as unknown as ActivatedRouteSnapshot, {} as unknown as RouterStateSnapshot));
  }

  it('allows navigation when authenticated', (done) => {
    mockAuthenticated.setResult(true);
    store.refreshState();

    (runGuard() as ReturnType<typeof of>).subscribe((result) => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('redirects to "/" when not authenticated', (done) => {
    mockAuthenticated.setResult(false);
    store.refreshState();

    (runGuard() as ReturnType<typeof of>).subscribe((result) => {
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
      expect(result).toBeTruthy();
      done();
    });
  });

  it('waits for auth to initialize before resolving', (done) => {
    mockInitialized.setResult(false);
    mockAuthenticated.setResult(true);
    store.refreshState();

    let emitted = false;
    (runGuard() as ReturnType<typeof of>).subscribe(() => (emitted = true));

    expect(emitted).toBeFalse();

    mockInitialized.setResult(true);
    store.refreshState();

    setTimeout(() => {
      expect(emitted).toBeTrue();
      done();
    });
  });
});
