import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, fromEvent, merge, interval, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  // ?ngsw-bypass tells Angular's Service Worker to skip cache and hit the network directly.
  // Without this, NGSW serves /favicon.ico from its prefetch cache even when offline,
  // making health checks always return true and defeating the purpose.
  private readonly HEALTH_CHECK_URL = '/favicon.ico?ngsw-bypass';
  private readonly HEALTH_CHECK_INTERVAL_MS = 10_000;

  private onlineSubject = new BehaviorSubject<boolean>(true);
  public online$ = this.onlineSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.onlineSubject.next(navigator.onLine);
      this.initializeNetworkListener();
      this.initializeHealthCheck();
    }
  }

  private initializeNetworkListener(): void {
    if (typeof window !== 'undefined' && window.navigator) {
      const online$ = fromEvent(window, 'online').pipe(map(() => true));
      const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

      merge(online$, offline$).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((isOnline: boolean) => {
        this.onlineSubject.next(isOnline);
        // Browser 'online' event can fire before connectivity is actually usable
        // (e.g. mobile radio waking up). Verify immediately with a real network probe.
        if (isOnline) {
          this.performHealthCheck().then(isReachable => {
            if (this.onlineSubject.value !== isReachable) {
              this.onlineSubject.next(isReachable);
            }
          });
        }
      });
    }
  }

  private initializeHealthCheck(): void {
    interval(this.HEALTH_CHECK_INTERVAL_MS).pipe(
      switchMap(() => from(this.performHealthCheck())),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((isReachable: boolean) => {
      if (this.onlineSubject.value !== isReachable) {
        this.onlineSubject.next(isReachable);
      }
    });
  }

  protected performHealthCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);
    return fetch(this.HEALTH_CHECK_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    }).then(
      (res) => { clearTimeout(timeoutId); return res.ok; },
      () => { clearTimeout(timeoutId); return false; }
    );
  }

  get isOnline(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return this.onlineSubject.value;
    }
    return true;
  }

  get isOffline(): boolean {
    return !this.isOnline;
  }
}
