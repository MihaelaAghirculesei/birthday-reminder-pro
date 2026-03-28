import {
  BirthdaySchema,
  CategorySchema,
  ScheduledMessageSchema,
  sanitizeBirthdayData,
} from './birthday.schema';

const BASE_BIRTHDAY = { id: 'abc-123', name: 'Alice', birthDate: '1990-06-15' };

const BASE_CATEGORY = { id: 'cat-1', name: 'Family', icon: '👨‍👩‍👧', color: '#FF5733' };

const BASE_MESSAGE = {
  id: 'msg-1',
  title: 'Happy Birthday',
  message: 'Have a great day!',
  scheduledTime: '09:00',
  active: true,
  createdDate: new Date('2025-01-01'),
  messageType: 'text' as const,
  priority: 'normal' as const,
};

describe('BirthdaySchema', () => {
  it('accepts a minimal valid birthday', () => {
    expect(BirthdaySchema.safeParse(BASE_BIRTHDAY).success).toBeTrue();
  });

  describe('id', () => {
    it('rejects empty string', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, id: '' }).success).toBeFalse();
    });
  });

  describe('name', () => {
    it('rejects empty string', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, name: '' }).success).toBeFalse();
    });

    it('rejects whitespace-only', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, name: '   ' }).success).toBeFalse();
    });

    it('trims surrounding whitespace', () => {
      const result = BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, name: '  Alice  ' });
      expect(result.success && result.data.name).toBe('Alice');
    });

    it('rejects names over 200 chars', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, name: 'a'.repeat(201) }).success).toBeFalse();
    });
  });

  describe('birthDate', () => {
    it('rejects free-form strings', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, birthDate: 'not-a-date' }).success).toBeFalse();
    });

    it('rejects month > 12', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, birthDate: '2000-13-01' }).success).toBeFalse();
    });

    it('rejects day > 31', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, birthDate: '2000-01-32' }).success).toBeFalse();
    });

    it('rejects non-existent calendar date (Feb 30)', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, birthDate: '2001-02-30' }).success).toBeFalse();
    });

    it('accepts leap-year Feb 29', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, birthDate: '2000-02-29' }).success).toBeTrue();
    });

    it('rejects partial date strings', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, birthDate: '1990-06' }).success).toBeFalse();
    });
  });

  describe('reminderDays', () => {
    it('rejects fractional values', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, reminderDays: 1.5 }).success).toBeFalse();
    });

    it('rejects zero', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, reminderDays: 0 }).success).toBeFalse();
    });

    it('rejects negative values', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, reminderDays: -1 }).success).toBeFalse();
    });

    it('rejects values over 365', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, reminderDays: 366 }).success).toBeFalse();
    });

    it('accepts boundary values 1 and 365', () => {
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, reminderDays: 1 }).success).toBeTrue();
      expect(BirthdaySchema.safeParse({ ...BASE_BIRTHDAY, reminderDays: 365 }).success).toBeTrue();
    });
  });
});

describe('CategorySchema', () => {
  it('accepts a valid category', () => {
    expect(CategorySchema.safeParse(BASE_CATEGORY).success).toBeTrue();
  });

  it('rejects empty id', () => {
    expect(CategorySchema.safeParse({ ...BASE_CATEGORY, id: '' }).success).toBeFalse();
  });

  it('rejects empty icon', () => {
    expect(CategorySchema.safeParse({ ...BASE_CATEGORY, icon: '' }).success).toBeFalse();
  });

  it('rejects shorthand hex color', () => {
    expect(CategorySchema.safeParse({ ...BASE_CATEGORY, color: '#FFF' }).success).toBeFalse();
  });

  it('rejects named colors', () => {
    expect(CategorySchema.safeParse({ ...BASE_CATEGORY, color: 'red' }).success).toBeFalse();
  });

  it('accepts full 6-digit hex', () => {
    expect(CategorySchema.safeParse({ ...BASE_CATEGORY, color: '#aabbcc' }).success).toBeTrue();
  });
});

describe('ScheduledMessageSchema', () => {
  it('accepts a valid message', () => {
    expect(ScheduledMessageSchema.safeParse(BASE_MESSAGE).success).toBeTrue();
  });

  it('rejects empty id', () => {
    expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, id: '' }).success).toBeFalse();
  });

  describe('scheduledTime', () => {
    it('rejects hour > 23', () => {
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, scheduledTime: '25:00' }).success).toBeFalse();
    });

    it('rejects single-digit hour (no leading zero)', () => {
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, scheduledTime: '9:00' }).success).toBeFalse();
    });

    it('rejects minute > 59', () => {
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, scheduledTime: '12:60' }).success).toBeFalse();
    });

    it('rejects free-form strings', () => {
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, scheduledTime: 'morning' }).success).toBeFalse();
    });

    it('accepts boundary values 00:00 and 23:59', () => {
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, scheduledTime: '00:00' }).success).toBeTrue();
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, scheduledTime: '23:59' }).success).toBeTrue();
    });
  });

  describe('sentCount', () => {
    it('rejects negative values', () => {
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, sentCount: -1 }).success).toBeFalse();
    });

    it('rejects fractional values', () => {
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, sentCount: 0.5 }).success).toBeFalse();
    });

    it('accepts zero and positive integers', () => {
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, sentCount: 0 }).success).toBeTrue();
      expect(ScheduledMessageSchema.safeParse({ ...BASE_MESSAGE, sentCount: 42 }).success).toBeTrue();
    });
  });
});

describe('sanitizeBirthdayData', () => {
  it('converts empty strings to undefined for optional string fields', () => {
    const result = sanitizeBirthdayData({ email: '', phone: '', telegramUsername: '', name: 'Alice' });
    expect(result['email']).toBeUndefined();
    expect(result['phone']).toBeUndefined();
    expect(result['telegramUsername']).toBeUndefined();
    expect(result['name']).toBe('Alice');
  });

  it('converts null to undefined for optional string fields', () => {
    const result = sanitizeBirthdayData({ email: null, notes: null });
    expect(result['email']).toBeUndefined();
    expect(result['notes']).toBeUndefined();
  });

  it('does not mutate the original object', () => {
    const input = { email: '', name: 'Bob' };
    sanitizeBirthdayData(input);
    expect(input.email).toBe('');
  });

  it('preserves defined non-empty values', () => {
    const result = sanitizeBirthdayData({ email: 'a@b.com', notes: 'hello' });
    expect(result['email']).toBe('a@b.com');
    expect(result['notes']).toBe('hello');
  });
});
