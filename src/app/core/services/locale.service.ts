import { isPlatformBrowser } from '@angular/common';
import { inject,Injectable, PLATFORM_ID, signal } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export type AppLocale = 'en-US' | 'it-IT';

const SUPPORTED_LOCALES: Record<string, AppLocale> = {
  en: 'en-US',
  it: 'it-IT'
};
const STORAGE_KEY = 'app_lang';
const DEFAULT_LANG = 'en';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);

  private readonly _currentLocale = signal<AppLocale>('en-US');
  readonly currentLocale = this._currentLocale.asReadonly();

  private readonly _lang = signal<string>(DEFAULT_LANG);
  readonly lang = this._lang.asReadonly();

  get currentLang(): string {
    return this.translate.currentLang ?? DEFAULT_LANG;
  }

  async initialize(): Promise<void> {
    this.translate.addLangs(['en', 'it']);
    this.translate.setDefaultLang(DEFAULT_LANG);

    const saved = isPlatformBrowser(this.platformId)
      ? (localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LANG)
      : DEFAULT_LANG;

    const lang = this.translate.getLangs().includes(saved) ? saved : DEFAULT_LANG;

    // Apply state synchronously so signals are up-to-date immediately.
    this._currentLocale.set(SUPPORTED_LOCALES[lang] ?? 'en-US');
    this._lang.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }

    // Await translation loading so APP_INITIALIZER (and Angular zone stability)
    // does not complete until the language bundle is ready. Without this await,
    // whenStable() can fire before a non-English bundle has been applied, causing
    // the UI to render in English even when the user's saved language is Italian.
    await firstValueFrom(this.translate.use(lang));
  }

  toggleLanguage(): void {
    const next = this.currentLang === 'en' ? 'it' : 'en';
    this.setLanguage(next);
  }

  setLanguage(lang: string): void {
    this.translate.use(lang);
    this._currentLocale.set(SUPPORTED_LOCALES[lang] ?? 'en-US');
    this._lang.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }
  }
}
