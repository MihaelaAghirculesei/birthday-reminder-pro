import {
  sanitizeFileName,
  sanitizeUserInput,
  sanitizeUrl,
  sanitizePhoneNumber,
  sanitizeEmail,
  escapeHtml,
  validateBirthdayName,
  validateBirthdayNotes,
  sanitizeBirthdayData
} from './sanitization.utils';

describe('sanitization.utils', () => {
  describe('sanitizeFileName', () => {
    it('should replace special characters with underscores', () => {
      expect(sanitizeFileName('file name!@#$.txt')).toBe('file_name____.txt');
    });

    it('should allow alphanumeric, dots, underscores, and hyphens', () => {
      expect(sanitizeFileName('valid-file_name.txt')).toBe('valid-file_name.txt');
    });

    it('should replace consecutive dots with single dot', () => {
      expect(sanitizeFileName('file...name.txt')).toBe('file.name.txt');
    });

    it('should truncate to 255 characters', () => {
      const longName = 'a'.repeat(300);
      expect(sanitizeFileName(longName).length).toBe(255);
    });

    it('should handle empty string', () => {
      expect(sanitizeFileName('')).toBe('');
    });
  });

  describe('sanitizeUserInput', () => {
    it('should remove script tags', () => {
      expect(sanitizeUserInput('<script>alert("xss")</script>Hello'))
        .toBe('Hello');
    });

    it('should remove iframe tags', () => {
      expect(sanitizeUserInput('<iframe src="evil.com"></iframe>Content'))
        .toBe('Content');
    });

    it('should remove object tags', () => {
      expect(sanitizeUserInput('<object data="evil.swf"></object>Safe'))
        .toBe('Safe');
    });

    it('should remove embed tags', () => {
      expect(sanitizeUserInput('<embed src="evil.swf"></embed>Text'))
        .toBe('Text');
    });

    it('should remove inline event handlers', () => {
      expect(sanitizeUserInput('<div onclick="evil()">Click</div>'))
        .toBe('<div >Click</div>');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeUserInput('Click <a href="javascript:alert(1)">here</a>'))
        .toBe('Click <a href="alert(1)">here</a>');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUserInput('  Hello World  ')).toBe('Hello World');
    });

    it('should handle safe input unchanged', () => {
      expect(sanitizeUserInput('John Doe')).toBe('John Doe');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should allow mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should reject javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should reject data URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not a valid url')).toBe('');
    });

    it('should reject ftp URLs', () => {
      expect(sanitizeUrl('ftp://example.com')).toBe('');
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should keep valid phone characters', () => {
      expect(sanitizePhoneNumber('+1 (555) 123-4567'))
        .toBe('+1 (555) 123-4567');
    });

    it('should remove letters and special characters', () => {
      expect(sanitizePhoneNumber('Call: 555-1234 now!')).toBe('555-1234');
    });

    it('should trim whitespace', () => {
      expect(sanitizePhoneNumber('  555-1234  ')).toBe('555-1234');
    });

    it('should handle empty string', () => {
      expect(sanitizePhoneNumber('')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should lowercase email', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should handle empty string', () => {
      expect(sanitizeEmail('')).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape less than', () => {
      expect(escapeHtml('5 < 10')).toBe('5 &lt; 10');
    });

    it('should escape greater than', () => {
      expect(escapeHtml('10 > 5')).toBe('10 &gt; 5');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's fine")).toBe('It&#039;s fine');
    });

    it('should escape all special characters together', () => {
      expect(escapeHtml('<script>"alert(\'xss\')"</script>'))
        .toBe('&lt;script&gt;&quot;alert(&#039;xss&#039;)&quot;&lt;/script&gt;');
    });

    it('should handle safe text unchanged', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('validateBirthdayName', () => {
    it('should return true for valid name', () => {
      expect(validateBirthdayName('John Doe')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(validateBirthdayName('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(validateBirthdayName('   ')).toBe(false);
    });

    it('should return false for name over 100 characters', () => {
      expect(validateBirthdayName('a'.repeat(101))).toBe(false);
    });

    it('should return false for name with script tag', () => {
      expect(validateBirthdayName('<script>alert(1)</script>')).toBe(false);
    });

    it('should return false for name with iframe', () => {
      expect(validateBirthdayName('<iframe src="evil">')).toBe(false);
    });

    it('should return false for name with javascript:', () => {
      expect(validateBirthdayName('javascript:alert(1)')).toBe(false);
    });

    it('should return false for name with event handler', () => {
      expect(validateBirthdayName('onclick=evil()')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(validateBirthdayName(null as unknown as string)).toBe(false);
      expect(validateBirthdayName(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateBirthdayNotes', () => {
    it('should return true for valid notes', () => {
      expect(validateBirthdayNotes('Loves chocolate cake')).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(validateBirthdayNotes('')).toBe(true);
    });

    it('should return true for null/undefined', () => {
      expect(validateBirthdayNotes(null as unknown as string)).toBe(true);
      expect(validateBirthdayNotes(undefined as unknown as string)).toBe(true);
    });

    it('should return false for notes over 500 characters', () => {
      expect(validateBirthdayNotes('a'.repeat(501))).toBe(false);
    });

    it('should return false for notes with script tag', () => {
      expect(validateBirthdayNotes('<script>evil()</script>')).toBe(false);
    });

    it('should return false for notes with iframe', () => {
      expect(validateBirthdayNotes('<iframe src="x">')).toBe(false);
    });

    it('should return false for notes with javascript:', () => {
      expect(validateBirthdayNotes('javascript:void(0)')).toBe(false);
    });

    it('should return false for notes with event handler', () => {
      expect(validateBirthdayNotes('onload=hack()')).toBe(false);
    });
  });

  describe('sanitizeBirthdayData', () => {
    it('should sanitize name', () => {
      const result = sanitizeBirthdayData({
        name: '<script>alert(1)</script>John'
      });
      expect(result.name).toBe('John');
    });

    it('should sanitize notes when present', () => {
      const result = sanitizeBirthdayData({
        name: 'John',
        notes: '<iframe>evil</iframe>Likes pizza'
      });
      expect(result.notes).toBe('Likes pizza');
    });

    it('should return undefined notes when not provided', () => {
      const result = sanitizeBirthdayData({ name: 'John' });
      expect(result.notes).toBeUndefined();
    });

    it('should return undefined notes when empty', () => {
      const result = sanitizeBirthdayData({ name: 'John', notes: '' });
      expect(result.notes).toBeUndefined();
    });

    it('should handle both name and notes with malicious content', () => {
      const result = sanitizeBirthdayData({
        name: 'John<script>x</script>',
        notes: '<object>y</object>Note'
      });
      expect(result.name).toBe('John');
      expect(result.notes).toBe('Note');
    });
  });
});
