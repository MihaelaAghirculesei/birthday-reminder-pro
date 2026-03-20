
export interface BirthdayCategory {
  id: string;
  name: string;
  nameKey?: string;
  nameTranslations?: Record<string, string>;
  icon: string;
  color: string;
}

export const BIRTHDAY_CATEGORIES: BirthdayCategory[] = [
  {
    id: 'family',
    name: 'Family',
    nameKey: 'CATEGORIES.FAMILY',
    icon: 'family_restroom',
    color: '#4CAF50'
  },
  {
    id: 'friends',
    name: 'Friends',
    nameKey: 'CATEGORIES.FRIENDS',
    icon: 'groups',
    color: '#2196F3'
  },
  {
    id: 'colleagues',
    name: 'Colleagues',
    nameKey: 'CATEGORIES.COLLEAGUES',
    icon: 'business_center',
    color: '#FF9800'
  },
  {
    id: 'romantic',
    name: 'Partner/Ex',
    nameKey: 'CATEGORIES.ROMANTIC',
    icon: 'favorite',
    color: '#E91E63'
  },
  {
    id: 'acquaintances',
    name: 'Acquaintances',
    nameKey: 'CATEGORIES.ACQUAINTANCES',
    icon: 'handshake',
    color: '#9C27B0'
  },
  {
    id: 'other',
    name: 'Other',
    nameKey: 'CATEGORIES.OTHER',
    icon: 'stars',
    color: '#607D8B'
  },
  {
    id: 'gaming',
    name: 'Gaming',
    nameKey: 'CATEGORIES.GAMING',
    icon: 'sports_esports',
    color: '#00BCD4'
  }
];

export const DEFAULT_CATEGORY = 'friends';

export function getCustomCategories(): BirthdayCategory[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem('customCategories');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getModifiedCategories(): BirthdayCategory[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem('modifiedCategories');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getDeletedCategoryIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem('deletedCategoryIds');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getAllCategories(): BirthdayCategory[] {
  const deletedIds = getDeletedCategoryIds();
  const modifiedCategories = getModifiedCategories();
  const modifiedMap = new Map(modifiedCategories.map(cat => [cat.id, cat]));

  const defaultCategories = BIRTHDAY_CATEGORIES
    .filter(cat => !deletedIds.includes(cat.id))
    .map(cat => modifiedMap.get(cat.id) || cat);

  const customCategories = getCustomCategories()
    .filter(cat => !deletedIds.includes(cat.id))
    .map(cat => modifiedMap.get(cat.id) || cat);

  return [...defaultCategories, ...customCategories];
}

export function getCategoryById(id: string): BirthdayCategory | undefined {
  return getAllCategories().find(cat => cat.id === id);
}

export function getCategoryIcon(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.icon || 'person';
}

export function getCategoryColor(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.color || '#607D8B';
}