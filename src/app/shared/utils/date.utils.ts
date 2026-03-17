/** Parses YYYY-MM-DD as local Date (no timezone shift) */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Normalizes any date-like value to YYYY-MM-DD */
export function toDateString(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDaysUntilBirthday(birthDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextBirthday = getNextBirthdayDate(birthDate);
  nextBirthday.setHours(0, 0, 0, 0);
  const diffTime = nextBirthday.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getNextBirthdayDate(birthDate: string): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const bd = parseLocalDate(birthDate);
  const nextBirthday = new Date(currentYear, bd.getMonth(), bd.getDate());
  nextBirthday.setHours(0, 0, 0, 0);

  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1);
  }

  return nextBirthday;
}

export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow!';
  return `In ${days} days`;
}
