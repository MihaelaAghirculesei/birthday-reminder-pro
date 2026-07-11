import { parseLocalDate } from './parsing.util';

/**
 * Calculate the age based on a birth date
 * @param birthDate YYYY-MM-DD string
 * @returns
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = parseLocalDate(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/** Same as calculateAge, but null for a not-yet-reached (future) birth date */
export function calculateAgeOrNull(birthDate: string): number | null {
  const age = calculateAge(birthDate);
  return age >= 0 ? age : null;
}
