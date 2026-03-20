import { importProvidersFrom } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { en } from '../app/core/i18n/translations/en';

class FakeLoader implements TranslateLoader {
  getTranslation(): Observable<object> {
    return of(en);
  }
}

/**
 * Provides TranslateModule with real English translations for unit tests.
 * This ensures translate.instant() resolves correctly instead of returning keys.
 * Add to the `providers` array of TestBed.configureTestingModule.
 */
export const provideTranslateTesting = () =>
  importProvidersFrom(
    TranslateModule.forRoot({
      loader: { provide: TranslateLoader, useClass: FakeLoader },
      defaultLanguage: 'en'
    })
  );
