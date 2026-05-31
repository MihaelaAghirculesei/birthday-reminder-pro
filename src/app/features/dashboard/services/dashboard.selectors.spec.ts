import { selectSortedBirthdays } from '../../../core/store/birthday/birthday.selectors';
import { type BirthdayState, initialBirthdayFilters } from '../../../core/store/birthday/birthday.state';
import { categoryAdapter,type CategoryState } from '../../../core/store/category/category.state';
import { type BirthdayCategory } from '../../../shared';
import { type Birthday } from '../../../shared/models/birthday.model';
import { selectFilteredSortedBirthdays } from './dashboard.selectors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(
  birthdays: Birthday[],
  filters: Partial<typeof initialBirthdayFilters> = {},
  categories: BirthdayCategory[] = []
) {
  const birthdayState: BirthdayState = {
    ids: birthdays.map(b => b.id),
    entities: Object.fromEntries(birthdays.map(b => [b.id, b])),
    filters: { ...initialBirthdayFilters, ...filters },
    saving: false,
    deleting: false,
    syncing: false,
    error: null,
    optimisticBackup: []
  };

  const categoryState: CategoryState = categoryAdapter.setAll(categories, {
    ...categoryAdapter.getInitialState(),
    loaded: true,
    loading: false,
    error: null,
    deletedCategoryIds: [],
    customCategoryIds: []
  });

  return { birthdays: birthdayState, categories: categoryState };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TODAY = new Date();

function daysFromNow(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  // Use a birth year far in the past; only month/day matter for next-birthday calc.
  return `1990-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const mockCategories: BirthdayCategory[] = [
  { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
  { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' }
];

const alice: Birthday = {
  id: '1', name: 'Alice', birthDate: daysFromNow(10), category: 'friends',
  zodiacSign: '', reminderDays: 7, notes: '', scheduledMessages: []
};
const bob: Birthday = {
  id: '2', name: 'Bob', birthDate: daysFromNow(5), category: 'family',
  zodiacSign: '', reminderDays: 7, notes: '', scheduledMessages: []
};
const charlie: Birthday = {
  id: '3', name: 'Charlie', birthDate: daysFromNow(20), category: 'friends',
  zodiacSign: '', reminderDays: 7, notes: '', scheduledMessages: []
};
const orphan: Birthday = {
  id: '4', name: 'Dave', birthDate: daysFromNow(2), category: 'nonexistent-cat',
  zodiacSign: '', reminderDays: 7, notes: '', scheduledMessages: []
};

// ---------------------------------------------------------------------------
// selectSortedBirthdays
// ---------------------------------------------------------------------------

describe('selectSortedBirthdays', () => {
  beforeEach(() => selectSortedBirthdays.release());

  it('returns birthdays ordered by days-until-birthday ascending', () => {
    const state = makeState([alice, bob, charlie]);
    const result = selectSortedBirthdays(state);
    expect(result.map(b => b.id)).toEqual(['2', '1', '3']); // bob(5) alice(10) charlie(20)
  });

  it('does not mutate the original store array', () => {
    const state = makeState([alice, bob]);
    const original = (state.birthdays.ids as string[]).slice();
    selectSortedBirthdays(state);
    expect(state.birthdays.ids as string[]).toEqual(original);
  });

  it('returns empty array for empty store', () => {
    const state = makeState([]);
    expect(selectSortedBirthdays(state)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectFilteredSortedBirthdays
// ---------------------------------------------------------------------------

describe('selectFilteredSortedBirthdays', () => {
  beforeEach(() => selectFilteredSortedBirthdays.release());

  it('returns all birthdays sorted when no filters active', () => {
    const state = makeState([alice, charlie, bob], {}, mockCategories);
    const result = selectFilteredSortedBirthdays(state);
    expect(result.map(b => b.id)).toEqual(['2', '1', '3']); // bob(5) alice(10) charlie(20)
  });

  it('filters by category', () => {
    const state = makeState([alice, bob, charlie], { selectedCategory: 'friends' }, mockCategories);
    const result = selectFilteredSortedBirthdays(state);
    expect(result.every(b => b.category === 'friends')).toBeTrue();
    expect(result.length).toBe(2);
  });

  it('filters by search term (case-insensitive, word-start match)', () => {
    const state = makeState([alice, bob, charlie], { searchTerm: 'ali' }, mockCategories);
    const result = selectFilteredSortedBirthdays(state);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alice');
  });

  it('search match is word-start only (does not match mid-word)', () => {
    const state = makeState([alice, bob], { searchTerm: 'ice' }, mockCategories);
    expect(selectFilteredSortedBirthdays(state).length).toBe(0);
  });

  it('applies both category and search filters together', () => {
    const state = makeState(
      [alice, bob, charlie],
      { selectedCategory: 'friends', searchTerm: 'ali' },
      mockCategories
    );
    const result = selectFilteredSortedBirthdays(state);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alice');
  });

  it('filters __orphaned__ category (birthday whose category is not in the category list)', () => {
    const state = makeState(
      [alice, bob, orphan],
      { selectedCategory: '__orphaned__' },
      mockCategories
    );
    const result = selectFilteredSortedBirthdays(state);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('4');
  });

  it('returns empty array when no birthday matches search', () => {
    const state = makeState([alice, bob], { searchTerm: 'zzz' }, mockCategories);
    expect(selectFilteredSortedBirthdays(state)).toEqual([]);
  });

  it('returns empty array for empty store', () => {
    const state = makeState([], {}, mockCategories);
    expect(selectFilteredSortedBirthdays(state)).toEqual([]);
  });

  it('preserves sort order after filtering', () => {
    const state = makeState([charlie, alice], { selectedCategory: 'friends' }, mockCategories);
    const result = selectFilteredSortedBirthdays(state);
    // alice is 10 days away, charlie is 20 — alice must come first
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });
});
