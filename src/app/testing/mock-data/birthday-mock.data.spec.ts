import {
  MOCK_BIRTHDAY_RAW_DATA,
  generateAvatarUrl,
  generateMockBirthdays,
  createMockBirthday
} from './birthday-mock.data';

describe('Birthday Mock Data', () => {
  const mockIdGenerator = () => 'test-id-123';

  describe('MOCK_BIRTHDAY_RAW_DATA', () => {
    it('should contain 45 test entries', () => {
      expect(MOCK_BIRTHDAY_RAW_DATA.length).toBe(45);
    });

    it('should have required fields for each entry', () => {
      MOCK_BIRTHDAY_RAW_DATA.forEach((entry, index) => {
        expect(entry.name).toBeTruthy(`Entry ${index} missing name`);
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.category).toBeTruthy(`Entry ${index} missing category`);
        expect(entry.notes).toBeTruthy(`Entry ${index} missing notes`);
      });
    });

    it('should have diverse categories', () => {
      const categories = new Set(MOCK_BIRTHDAY_RAW_DATA.map(e => e.category));
      expect(categories.size).toBeGreaterThan(5);
    });

    it('should include entries with and without photos', () => {
      const withPhoto = MOCK_BIRTHDAY_RAW_DATA.filter(e => e.photo !== null);
      const withoutPhoto = MOCK_BIRTHDAY_RAW_DATA.filter(e => e.photo === null);
      expect(withPhoto.length).toBeGreaterThan(0);
      expect(withoutPhoto.length).toBeGreaterThan(0);
    });
  });

  describe('generateAvatarUrl', () => {
    it('should generate a valid URL', () => {
      const url = generateAvatarUrl('John Doe');
      expect(url).toContain('https://ui-avatars.com/api/');
    });

    it('should encode the name parameter', () => {
      const url = generateAvatarUrl('John Doe');
      expect(url).toContain('name=John%20Doe');
    });

    it('should include size parameter', () => {
      const url = generateAvatarUrl('Test');
      expect(url).toContain('size=200');
    });

    it('should handle special characters', () => {
      const url = generateAvatarUrl('Müller & Sons');
      expect(url).toContain('name=M%C3%BCller%20%26%20Sons');
    });

    it('should include styling parameters', () => {
      const url = generateAvatarUrl('Test');
      expect(url).toContain('background=random');
      expect(url).toContain('color=fff');
      expect(url).toContain('bold=true');
    });
  });

  describe('generateMockBirthdays', () => {
    it('should generate birthdays from raw data', () => {
      let idCounter = 0;
      const idGen = () => `id-${++idCounter}`;
      const birthdays = generateMockBirthdays(idGen);

      expect(birthdays.length).toBe(MOCK_BIRTHDAY_RAW_DATA.length);
    });

    it('should use the provided ID generator', () => {
      const birthdays = generateMockBirthdays(mockIdGenerator);

      birthdays.forEach(b => {
        expect(b.id).toBe('test-id-123');
      });
    });

    it('should calculate zodiac signs', () => {
      const birthdays = generateMockBirthdays(mockIdGenerator);

      birthdays.forEach(b => {
        expect(b.zodiacSign).toBeTruthy();
      });
    });

    it('should set default reminder days', () => {
      const birthdays = generateMockBirthdays(mockIdGenerator);

      birthdays.forEach(b => {
        expect(b.reminderDays).toBe(7);
      });
    });

    it('should generate avatar URL for entries without photo', () => {
      const birthdays = generateMockBirthdays(mockIdGenerator);
      const entriesWithoutPhoto = MOCK_BIRTHDAY_RAW_DATA.filter(e => e.photo === null);

      entriesWithoutPhoto.forEach(entry => {
        const birthday = birthdays.find(b => b.name === entry.name);
        expect(birthday?.photo).toContain('ui-avatars.com');
      });
    });

    it('should preserve original photo URLs', () => {
      const birthdays = generateMockBirthdays(mockIdGenerator);
      const entriesWithPhoto = MOCK_BIRTHDAY_RAW_DATA.filter(e => e.photo !== null);

      entriesWithPhoto.forEach(entry => {
        const birthday = birthdays.find(b => b.name === entry.name);
        expect(birthday?.photo).toBe(entry.photo as string);
      });
    });

    it('should initialize empty scheduledMessages array', () => {
      const birthdays = generateMockBirthdays(mockIdGenerator);

      birthdays.forEach(b => {
        expect(b.scheduledMessages).toEqual([]);
      });
    });
  });

  describe('createMockBirthday', () => {
    it('should create a birthday with default values', () => {
      const birthday = createMockBirthday(mockIdGenerator);

      expect(birthday.id).toBe('test-id-123');
      expect(birthday.name).toBe('Test User');
      expect(birthday.category).toBe('friends');
      expect(birthday.reminderDays).toBe(7);
    });

    it('should use the provided ID generator', () => {
      let counter = 0;
      const customIdGen = () => `custom-${++counter}`;

      const b1 = createMockBirthday(customIdGen);
      const b2 = createMockBirthday(customIdGen);

      expect(b1.id).toBe('custom-1');
      expect(b2.id).toBe('custom-2');
    });

    it('should calculate zodiac sign for default date', () => {
      const birthday = createMockBirthday(mockIdGenerator);
      expect(birthday.zodiacSign).toBeTruthy();
    });

    it('should allow overriding specific fields', () => {
      const birthday = createMockBirthday(mockIdGenerator, {
        name: 'Custom Name',
        category: 'family'
      });

      expect(birthday.name).toBe('Custom Name');
      expect(birthday.category).toBe('family');
      expect(birthday.reminderDays).toBe(7);
    });

    it('should allow overriding all fields', () => {
      const customDate = '2000-06-15';
      const birthday = createMockBirthday(mockIdGenerator, {
        name: 'Full Override',
        birthDate: customDate,
        category: 'colleagues',
        notes: 'Custom notes',
        reminderDays: 14
      });

      expect(birthday.name).toBe('Full Override');
      expect(birthday.birthDate).toBe(customDate);
      expect(birthday.category).toBe('colleagues');
      expect(birthday.notes).toBe('Custom notes');
      expect(birthday.reminderDays).toBe(14);
    });

    it('should generate avatar URL for default user', () => {
      const birthday = createMockBirthday(mockIdGenerator);
      expect(birthday.photo).toContain('ui-avatars.com');
      expect(birthday.photo).toContain('Test%20User');
    });

    it('should initialize empty scheduledMessages', () => {
      const birthday = createMockBirthday(mockIdGenerator);
      expect(birthday.scheduledMessages).toEqual([]);
    });
  });
});
