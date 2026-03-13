import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private onlineSubject = new BehaviorSubject<boolean>(true);
  public online$ = this.onlineSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.onlineSubject.next(navigator.onLine);
      this.initializeNetworkListener();
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
      });
    }
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
