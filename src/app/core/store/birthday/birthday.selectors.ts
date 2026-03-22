import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BirthdayState } from './birthday.state';
import { birthdayAdapter } from './birthday.reducer';
import { calculateAge } from '../../../shared';
import { getNextBirthdayDate, getDaysUntilBirthday } from '../../../shared/utils/date.utils';

export const selectBirthdayState = createFeatureSelector<BirthdayState>('birthdays');

const {
  selectEntities,
  selectAll,
  selectTotal
} = birthdayAdapter.getSelectors(selectBirthdayState);

export const selectAllBirthdays = selectAll;
export const selectBirthdayEntities = selectEntities;
export const selectBirthdayTotal = selectTotal;

const selectBirthdayFilters = createSelector(
  selectBirthdayState,
  (state) => state.filters
);

export const selectSearchTerm = createSelector(
  selectBirthdayFilters,
  (filters) => filters.searchTerm
);

export const selectSelectedCategory = createSelector(
  selectBirthdayFilters,
  (filters) => filters.selectedCategory
);

export const selectSortedBirthdays = createSelector(
  selectAllBirthdays,
  (birthdays) =>
    [...birthdays].sort(
      (a, b) =>
        getNextBirthdayDate(a.birthDate).getTime() -
        getNextBirthdayDate(b.birthDate).getTime()
    )
);

export const selectNext5Birthdays = createSelector(
  selectAllBirthdays,
  (birthdays) => {
    return birthdays
      .map(birthday => ({
        ...birthday,
        nextBirthday: getNextBirthdayDate(birthday.birthDate),
        daysUntil: getDaysUntilBirthday(birthday.birthDate)
      }))
      .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime())
      .slice(0, 5);
  }
);

export const selectAverageAge = createSelector(
  selectAllBirthdays,
  (birthdays) => {
    if (birthdays.length === 0) return 0;
    const totalAge = birthdays.reduce((sum, birthday) =>
      sum + calculateAge(birthday.birthDate), 0
    );
    return Math.round(totalAge / birthdays.length);
  }
);

export const selectMessagesByBirthday = (birthdayId: string) => createSelector(
  selectBirthdayEntities,
  (entities) => {
    const birthday = entities[birthdayId];
    return birthday?.scheduledMessages || [];
  }
);

export const selectBirthdayById = (id: string) => createSelector(
  selectBirthdayEntities,
  (entities) => entities[id]
);
