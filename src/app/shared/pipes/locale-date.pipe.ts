import { Pipe, PipeTransform, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LocaleService } from '../../core/services/locale.service';

/**
 * Wraps Angular DatePipe and automatically applies the user's active locale,
 * so dates display in the correct language (e.g. "January" vs "gennaio").
 *
 * Usage: {{ date | localeDate:'dd MMMM yyyy' }}
 *
 * The pipe is impure so it re-evaluates when the locale changes at runtime.
 */
@Pipe({
  name: 'localeDate',
  standalone: true,
  pure: false
})
export class LocaleDatePipe implements PipeTransform {
  private readonly localeService = inject(LocaleService);

  transform(value: Date | string | number | null | undefined, format = 'mediumDate', timezone?: string): string | null {
    const locale = this.localeService.currentLocale();
    const pipe = new DatePipe(locale);
    return pipe.transform(value, format, timezone);
  }
}
