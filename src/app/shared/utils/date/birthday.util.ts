import { ONE_DAY_MS } from '../../../core/constants/time.constants';
import { parseLocalDate } from './parsing.util';

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysUntilBirthday(birthDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextBirthday = getNextBirthdayDate(birthDate);
  nextBirthday.setHours(0, 0, 0, 0);
  const diffTime = nextBirthday.getTime() - today.getTime();
  return Math.round(diffTime / ONE_DAY_MS);
}

export function getNextBirthdayDate(birthDate: string): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const bd = parseLocalDate(birthDate);
  const isLeapDayBirth = bd.getMonth() === 1 && bd.getDate() === 29;
  const effectiveDay = (year: number) => isLeapDayBirth && !isLeapYear(year) ? 28 : bd.getDate();

  const nextBirthday = new Date(currentYear, bd.getMonth(), effectiveDay(currentYear));
  nextBirthday.setHours(0, 0, 0, 0);

  if (nextBirthday < today) {
    const nextYear = currentYear + 1;
    nextBirthday.setFullYear(nextYear, bd.getMonth(), effectiveDay(nextYear));
  }

  return nextBirthday;
}

export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow!';
  return `In ${days} days`;
}
