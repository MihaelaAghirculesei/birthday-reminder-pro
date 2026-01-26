import { isDevMode } from '@angular/core';

/**
 * Check if running in test environment (Karma)
 * Used to suppress console logging during tests
 */
function isTestEnvironment(): boolean {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return false;
  }
  // Karma runs on port 9876 by default, or URL contains 'karma'
  return window.location.port === '9876' ||
         window.location.href.includes('karma') ||
         window.location.href.includes('_karma_webpack_');
}

export interface BirthdayCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const BIRTHDAY_CATEGORIES: BirthdayCategory[] = [
  {
    id: 'family',
    name: 'Family',
    icon: 'family_restroom',
    color: '#4CAF50'
  },
  {
    id: 'friends',
    name: 'Friends',
    icon: 'groups',
    color: '#2196F3'
  },
  {
    id: 'colleagues',
    name: 'Colleagues',
    icon: 'business_center',
    color: '#FF9800'
  },
  {
    id: 'romantic',
    name: 'Partner/Ex',
    icon: 'favorite',
    color: '#E91E63'
  },
  {
    id: 'acquaintances',
    name: 'Acquaintances',
    icon: 'handshake',
    color: '#9C27B0'
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'stars',
    color: '#607D8B'
  },
  {
    id: 'gaming',
    name: 'Gaming',
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
  } catch (error) {
    if (isDevMode() && !isTestEnvironment()) {
      console.error('Failed to load custom categories:', error);
    }
    return [];
  }
}

function getModifiedCategories(): BirthdayCategory[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem('modifiedCategories');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    if (isDevMode() && !isTestEnvironment()) {
      console.error('Failed to load modified categories:', error);
    }
    return [];
  }
}

function getDeletedCategoryIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem('deletedCategoryIds');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    if (isDevMode() && !isTestEnvironment()) {
      console.error('Failed to load deleted category IDs:', error);
    }
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