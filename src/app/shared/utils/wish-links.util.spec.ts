import { type Birthday } from '../models/birthday.model';
import {
  buildEmailWishLink,
  buildSmsWishLink,
  buildTelegramWishLink,
  buildWhatsAppWishLink,
  getAvailableWishLinks,
  resolveMessageTemplate,
} from './wish-links.util';

describe('wish-links.util', () => {
  const baseBirthday: Birthday = {
    id: 'wish-test-1',
    name: 'Alice',
    birthDate: '1990-06-15',
    zodiacSign: 'Gemini',
  };

  describe('resolveMessageTemplate', () => {
    it('should replace {name} with birthday name', () => {
      expect(resolveMessageTemplate('Happy Birthday {name}!', baseBirthday))
        .toBe('Happy Birthday Alice!');
    });

    it('should replace {age} with calculated age', () => {
      const result = resolveMessageTemplate('You are turning {age}!', baseBirthday);
      expect(result).toMatch(/You are turning \d+!/);
    });

    it('should replace {zodiac} with zodiac sign', () => {
      expect(resolveMessageTemplate('Sign: {zodiac}', baseBirthday))
        .toBe('Sign: Gemini');
    });

    it('should replace {zodiac} with empty string when missing', () => {
      const noZodiac: Birthday = { ...baseBirthday, zodiacSign: undefined };
      expect(resolveMessageTemplate('Sign: {zodiac}', noZodiac))
        .toBe('Sign: ');
    });

    it('should replace multiple placeholders', () => {
      const result = resolveMessageTemplate('Dear {name}, happy {age}th! ({zodiac})', baseBirthday);
      expect(result).toContain('Dear Alice');
      expect(result).toContain('(Gemini)');
    });

    it('should handle template with no placeholders', () => {
      expect(resolveMessageTemplate('Just a message', baseBirthday))
        .toBe('Just a message');
    });
  });

  describe('buildEmailWishLink', () => {
    it('should build a mailto link with encoded params', () => {
      const result = buildEmailWishLink('alice@example.com', 'Happy Birthday!', 'Best wishes');
      expect(result).toContain('mailto:alice%40example.com');
      expect(result).toContain('subject=Happy%20Birthday!');
      expect(result).toContain('body=Best%20wishes');
    });

    it('should handle special characters in body', () => {
      const result = buildEmailWishLink('a@b.com', 'Hi', 'Line1\nLine2');
      expect(result).toContain('body=Line1%0ALine2');
    });
  });

  describe('buildWhatsAppWishLink', () => {
    it('should build a wa.me link with cleaned phone', () => {
      const result = buildWhatsAppWishLink('+1 (234) 567-8900', 'Happy Birthday!');
      expect(result).toContain('https://wa.me/%2B12345678900');
      expect(result).toContain('text=Happy%20Birthday!');
    });

    it('should strip spaces, dashes, and parentheses from phone', () => {
      const result = buildWhatsAppWishLink('+ 39 333-1234567', 'Hi');
      expect(result).toContain('wa.me/%2B393331234567');
    });
  });

  describe('buildSmsWishLink', () => {
    it('should build an sms link with cleaned phone', () => {
      const result = buildSmsWishLink('+1234567890', 'Hello!');
      expect(result).toContain('sms:%2B1234567890');
      expect(result).toContain('body=Hello!');
    });

    it('should strip formatting from phone number', () => {
      const result = buildSmsWishLink('(123) 456-7890', 'Hi');
      expect(result).toContain('sms:1234567890');
    });
  });

  describe('buildTelegramWishLink', () => {
    it('should build a t.me link with username and message', () => {
      const result = buildTelegramWishLink('alice_bot', 'Happy Birthday!');
      expect(result).toBe('https://t.me/alice_bot?text=Happy%20Birthday!');
    });

    it('should encode special characters in message', () => {
      const result = buildTelegramWishLink('user123', 'Hi & bye!');
      expect(result).toContain('text=Hi%20%26%20bye!');
    });
  });

  describe('getAvailableWishLinks', () => {
    it('should return empty array when no contact info exists', () => {
      const result = getAvailableWishLinks(baseBirthday, 'Hello');
      expect(result).toEqual([]);
    });

    it('should return email link when email exists', () => {
      const birthday: Birthday = { ...baseBirthday, email: 'alice@example.com' };
      const result = getAvailableWishLinks(birthday, 'Hello');
      expect(result.length).toBe(1);
      expect(result[0].channel).toBe('email');
      expect(result[0].url).toContain('mailto:');
    });

    it('should return whatsapp and sms links when phone exists', () => {
      const birthday: Birthday = { ...baseBirthday, phone: '+1234567890' };
      const result = getAvailableWishLinks(birthday, 'Hello');
      expect(result.length).toBe(2);
      expect(result.map(l => l.channel)).toEqual(['whatsapp', 'sms']);
    });

    it('should return telegram link when telegramUsername exists', () => {
      const birthday: Birthday = { ...baseBirthday, telegramUsername: 'alice_tg' };
      const result = getAvailableWishLinks(birthday, 'Hello');
      expect(result.length).toBe(1);
      expect(result[0].channel).toBe('telegram');
      expect(result[0].url).toContain('t.me/alice_tg');
    });

    it('should return all links when all contact info exists', () => {
      const birthday: Birthday = {
        ...baseBirthday,
        email: 'alice@example.com',
        phone: '+1234567890',
        telegramUsername: 'alice_tg',
      };
      const result = getAvailableWishLinks(birthday, 'Hello {name}');
      expect(result.length).toBe(4);
      expect(result.map(l => l.channel)).toEqual(['email', 'whatsapp', 'sms', 'telegram']);
    });

    it('should resolve template variables in message', () => {
      const birthday: Birthday = { ...baseBirthday, email: 'a@b.com' };
      const result = getAvailableWishLinks(birthday, 'Happy Birthday {name}!');
      expect(result[0].url).toContain('Happy%20Birthday%20Alice!');
    });

    it('should set correct colors for each channel', () => {
      const birthday: Birthday = {
        ...baseBirthday,
        email: 'a@b.com',
        phone: '+123',
        telegramUsername: 'tg',
      };
      const result = getAvailableWishLinks(birthday, 'Hi');
      const colorMap = Object.fromEntries(result.map(l => [l.channel, l.color]));
      expect(colorMap['email']).toBe('#D32F2F');
      expect(colorMap['whatsapp']).toBe('#25D366');
      expect(colorMap['sms']).toBe('#1976D2');
      expect(colorMap['telegram']).toBe('#0088cc');
    });
  });
});
