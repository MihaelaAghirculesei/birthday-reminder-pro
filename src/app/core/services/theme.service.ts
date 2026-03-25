import { Injectable, Inject, PLATFORM_ID, effect, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectDarkMode } from '../store/ui/ui.selectors';
import * as UIActions from '../store/ui/ui.actions';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'birthday-app-dark-mode';
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  darkMode: Signal<boolean> = toSignal(this.store.select(selectDarkMode), { initialValue: false });

  constructor(
    private store: Store<AppState>,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.initializeTheme();

    effect(() => {
      const enabled = this.darkMode();
      if (isPlatformBrowser(this.platformId)) {
        this.applyTheme(enabled);
        localStorage.setItem(this.STORAGE_KEY, String(enabled));
      }
    });
  }

  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const savedPreference = localStorage.getItem(this.STORAGE_KEY);
    const isDark = savedPreference === 'true';

    this.store.dispatch(UIActions.setDarkMode({ enabled: isDark }));
  }

  private applyTheme(isDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
    }

    document.body.classList.add('theme-transitioning');

    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    this.transitionTimer = setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
      this.transitionTimer = null;
    }, 600);
  }

  toggleDarkMode(): void {
    this.store.dispatch(UIActions.toggleDarkMode());
  }
}
