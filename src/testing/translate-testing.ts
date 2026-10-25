import { provideTranslateLoader, provideTranslateService, type TranslateLoader, type TranslationObject } from '@ngx-translate/core';
import { type Observable, of } from 'rxjs';

import { en } from '../app/core/i18n/translations/en';

class FakeLoader implements TranslateLoader {
  getTranslation(): Observable<TranslationObject> {
    return of(en);
  }
}

/**
 * Provides the translate service with real English translations for unit tests.
 * This ensures translate.instant() resolves correctly instead of returning keys.
 * Add to the `providers` array of TestBed.configureTestingModule.
 */
export const provideTranslateTesting = () =>
  provideTranslateService({
    loader: provideTranslateLoader(() => new FakeLoader()),
    fallbackLang: 'en'
  });
