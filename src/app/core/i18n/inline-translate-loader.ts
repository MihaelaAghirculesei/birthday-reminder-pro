import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { en } from './translations/en';
import { it } from './translations/it';

const TRANSLATIONS: Record<string, object> = { en, it };

/**
 * SSR-safe translate loader: translations are embedded at build time —
 * no HTTP request, no platform check needed.
 */
export class InlineTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<object> {
    return of(TRANSLATIONS[lang] ?? TRANSLATIONS['en']);
  }
}
