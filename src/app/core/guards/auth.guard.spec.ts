import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, Router, type RouterStateSnapshot, type UrlTree } from '@angular/router';
import { type MemoizedSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { type of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { selectAuthInitialized, selectIsAuthenticated } from '../store/auth/auth.selectors';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let store: MockStore;
  let router: MockedObject<Router>;
  let mockInitialized: MemoizedSelector<object, boolean>;
  let mockAuthenticated: MemoizedSelector<object, boolean>;

  beforeEach(() => {
    router = {
      createUrlTree: vi.fn().mockName('Router.createUrlTree')
    } as unknown as MockedObject<Router>;
    router.createUrlTree.mockReturnValue({ toString: () => '/' } as unknown as UrlTree);

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

  it('allows navigation when authenticated', async () => {
    mockAuthenticated.setResult(true);
    store.refreshState();

    (runGuard() as ReturnType<typeof of>).subscribe((result) => {
      expect(result).toBe(true);
    });
  });

  it('redirects to "/" when not authenticated', async () => {
    mockAuthenticated.setResult(false);
    store.refreshState();

    (runGuard() as ReturnType<typeof of>).subscribe((result) => {
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
      expect(result).toBeTruthy();
    });
  });

  it('waits for auth to initialize before resolving', async () => {
    mockInitialized.setResult(false);
    mockAuthenticated.setResult(true);
    store.refreshState();

    let emitted = false;
    (runGuard() as ReturnType<typeof of>).subscribe(() => (emitted = true));

    expect(emitted).toBe(false);

    mockInitialized.setResult(true);
    store.refreshState();

    setTimeout(() => {
      expect(emitted).toBe(true);
    });
  });
});
