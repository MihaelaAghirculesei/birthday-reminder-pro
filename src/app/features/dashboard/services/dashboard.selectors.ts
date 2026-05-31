import { createSelector } from '@ngrx/store';

import {
  selectSearchTerm,
  selectSelectedCategory,
  selectSortedBirthdays} from '../../../core/store/birthday/birthday.selectors';
import { selectAllCategories } from '../../../core/store/category/category.selectors';

/**
 * Memoized selector: birthdays already sorted by days-until-birthday,
 * then filtered by active category and search term.
 *
 * Memoization guarantees:
 * - Sort runs only when the raw birthday collection changes.
 * - Filter runs only when sorted list, search term, selected category,
 *   or category list changes — never all three together on every keystroke.
 */
export const selectFilteredSortedBirthdays = createSelector(
  selectSortedBirthdays,
  selectSelectedCategory,
  selectSearchTerm,
  selectAllCategories,
  (sortedBirthdays, selectedCategory, searchTerm, categories) => {
    let filtered = sortedBirthdays;

    if (selectedCategory) {
      if (selectedCategory === '__orphaned__') {
        const validIds = new Set(categories.map(c => c.id));
        filtered = filtered.filter(b => b.category && !validIds.has(b.category));
      } else {
        filtered = filtered.filter(b => b.category === selectedCategory);
      }
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().split(/\s+/).some(word => word.startsWith(lower))
      );
    }

    return filtered;
  }
);
