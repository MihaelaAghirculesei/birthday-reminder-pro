import { inject,Pipe, type PipeTransform } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { LocaleService } from '../../core/services/locale.service';
import { type BirthdayCategory } from '../constants/categories';

@Pipe({ name: 'categoryName', standalone: true, pure: false })
export class CategoryNamePipe implements PipeTransform {
  private translateService = inject(TranslateService);
  private localeService = inject(LocaleService);

  transform(category: BirthdayCategory): string {
    if (category.nameKey) {
      return this.translateService.instant(category.nameKey);
    }
    const lang = this.localeService.currentLang;
    return category.nameTranslations?.[lang] ?? category.name;
  }
}
