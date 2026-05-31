import { Injectable } from '@angular/core';

import { DEFAULT_CATEGORY,getZodiacSign } from '../../shared';
import { type Birthday } from '../../shared/models/birthday.model';

@Injectable({ providedIn: 'root' })
export class BirthdayNormalizationService {

  normalizeCategoryId(category?: string): string {
    if (!category) return DEFAULT_CATEGORY;

    const categoryMap: Record<string, string> = {
      'Family': 'family',
      'Friends': 'friends',
      'Work': 'colleagues',
      'Colleagues': 'colleagues',
      'Other': 'other',
      'Partner/Ex': 'romantic',
      'Romantic': 'romantic',
      'Acquaintances': 'acquaintances'
    };

    if (category === category.toLowerCase()) return category;
    return categoryMap[category] ?? category.toLowerCase();
  }

  normalize(birthday: Birthday): Birthday {
    return {
      ...birthday,
      zodiacSign: birthday.zodiacSign || getZodiacSign(birthday.birthDate).name,
      category: this.normalizeCategoryId(birthday.category)
    };
  }
}
