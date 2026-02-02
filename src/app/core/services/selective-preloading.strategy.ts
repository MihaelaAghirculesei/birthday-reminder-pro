import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Observable, EMPTY } from 'rxjs';
import { LoggerService } from './logger.service';

interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  saveData?: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private preloadedRoutes: string[] = [];

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (!isPlatformBrowser(this.platformId)) {
      return EMPTY;
    }

    const shouldPreload = route.data?.['preload'] === true;
    const routePath = route.path || 'unknown';

    if (!shouldPreload) {
      return EMPTY;
    }

    if (!this.isNetworkSuitable()) {
      this.logger.info(`[Preload] Skipping "${routePath}" - slow network or data-saver mode`);
      return EMPTY;
    }

    return new Observable(subscriber => {
      this.schedulePreload(() => {
        this.logger.info(`[Preload] Loading "${routePath}"...`);
        this.preloadedRoutes.push(routePath);

        load().subscribe({
          next: () => {
            this.logger.info(`[Preload] "${routePath}" loaded successfully`);
            subscriber.next(true);
            subscriber.complete();
          },
          error: (err) => {
            this.logger.warn(`[Preload] Failed to load "${routePath}":`, err);
            subscriber.complete();
          }
        });
      });
    });
  }

  getPreloadedRoutes(): string[] {
    return [...this.preloadedRoutes];
  }

  private isNetworkSuitable(): boolean {
    const connection = navigator.connection;

    if (!connection) {
      return true;
    }

    if (connection.saveData) {
      return false;
    }

    const slowConnections = ['slow-2g', '2g'];
    if (connection.effectiveType && slowConnections.includes(connection.effectiveType)) {
      return false;
    }

    return true;
  }

  private schedulePreload(callback: () => void): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 3000 });
    } else {
      setTimeout(callback, 100);
    }
  }
}
