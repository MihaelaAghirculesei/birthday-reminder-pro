import { TranslateLoader } from '@ngx-translate/core';
import { Observable, from, of } from 'rxjs';
import { en } from './translations/en';

/**
 * SSR-safe translate loader: English is embedded at build time (zero HTTP cost).
 * All other locales are loaded lazily — anonymous users on the default locale
 * never download the extra translation chunk.
 */
export class InlineTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<object> {
    if (lang === 'en') return of(en);
    if (lang === 'it') return from(import('./translations/it').then(m => m.it));
    return of(en);
  }
}
