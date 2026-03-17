export interface ZodiacSign {
  name: string;
  symbol: string;
  element: string;
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    name: 'Aquarius',
    symbol: '≋',
    element: 'Air',
    startDate: { month: 1, day: 20 },
    endDate: { month: 2, day: 18 }
  },
  {
    name: 'Pisces',
    symbol: '🐟',
    element: 'Water',
    startDate: { month: 2, day: 19 },
    endDate: { month: 3, day: 20 }
  },
  {
    name: 'Aries',
    symbol: '🐏',
    element: 'Fire',
    startDate: { month: 3, day: 21 },
    endDate: { month: 4, day: 19 }
  },
  {
    name: 'Taurus',
    symbol: '🐂',
    element: 'Earth',
    startDate: { month: 4, day: 20 },
    endDate: { month: 5, day: 20 }
  },
  {
    name: 'Gemini',
    symbol: '👯',
    element: 'Air',
    startDate: { month: 5, day: 21 },
    endDate: { month: 6, day: 20 }
  },
  {
    name: 'Cancer',
    symbol: '🦀',
    element: 'Water',
    startDate: { month: 6, day: 21 },
    endDate: { month: 7, day: 22 }
  },
  {
    name: 'Leo',
    symbol: '🦁',
    element: 'Fire',
    startDate: { month: 7, day: 23 },
    endDate: { month: 8, day: 22 }
  },
  {
    name: 'Virgo',
    symbol: '👩',
    element: 'Earth',
    startDate: { month: 8, day: 23 },
    endDate: { month: 9, day: 22 }
  },
  {
    name: 'Libra',
    symbol: '⚖',
    element: 'Air',
    startDate: { month: 9, day: 23 },
    endDate: { month: 10, day: 22 }
  },
  {
    name: 'Scorpio',
    symbol: '🦂',
    element: 'Water',
    startDate: { month: 10, day: 23 },
    endDate: { month: 11, day: 21 }
  },
  {
    name: 'Sagittarius',
    symbol: '🏹',
    element: 'Fire',
    startDate: { month: 11, day: 22 },
    endDate: { month: 12, day: 21 }
  },
  {
    name: 'Capricorn',
    symbol: '🐐',
    element: 'Earth',
    startDate: { month: 12, day: 22 },
    endDate: { month: 1, day: 19 }
  }
];

export function getZodiacSign(birthDate: string): ZodiacSign {
  const [, m, d] = birthDate.split('-').map(Number);
  const month = m;
  const day = d;

  for (const sign of ZODIAC_SIGNS) {
    if (sign.name === 'Capricorn') {
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
        return sign;
      }
    } else {
      if (
        (month === sign.startDate.month && day >= sign.startDate.day) ||
        (month === sign.endDate.month && day <= sign.endDate.day)
      ) {
        return sign;
      }
    }
  }

  return ZODIAC_SIGNS[0];
}