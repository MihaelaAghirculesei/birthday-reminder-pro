import { type Birthday } from '../models/birthday.model';
import { calculateAge } from './date/age.util';

export interface WishLink {
  channel: 'email' | 'whatsapp' | 'sms' | 'telegram';
  label: string;
  icon: string;
  url: string;
  color: string;
}

export function resolveMessageTemplate(template: string, birthday: Birthday, senderName = '', senderFullName = ''): string {
  return template
    .replace(/\{name\}/g, birthday.name)
    .replace(/\{age\}/g, calculateAge(birthday.birthDate).toString())
    .replace(/\{zodiac\}/g, birthday.zodiacSign || '')
    .replace(/\{sender\}/g, senderName)
    .replace(/\{senderFull\}/g, senderFullName || senderName);
}

export function buildEmailWishLink(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildWhatsAppWishLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return `https://wa.me/${encodeURIComponent(cleaned)}?text=${encodeURIComponent(message)}`;
}

export function buildSmsWishLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return `sms:${encodeURIComponent(cleaned)}?body=${encodeURIComponent(message)}`;
}

export function buildTelegramWishLink(username: string, message: string): string {
  return `https://t.me/${encodeURIComponent(username)}?text=${encodeURIComponent(message)}`;
}

export function getAvailableWishLinks(birthday: Birthday, message: string, senderName = '', senderFullName = ''): WishLink[] {
  const resolvedMessage = resolveMessageTemplate(message, birthday, senderName, senderFullName);
  const links: WishLink[] = [];

  if (birthday.email) {
    links.push({
      channel: 'email',
      label: 'Email',
      icon: 'email',
      url: buildEmailWishLink(birthday.email, `Happy Birthday ${birthday.name}!`, resolvedMessage),
      color: '#D32F2F'
    });
  }

  if (birthday.phone) {
    links.push({
      channel: 'whatsapp',
      label: 'WhatsApp',
      icon: 'chat',
      url: buildWhatsAppWishLink(birthday.phone, resolvedMessage),
      color: '#25D366'
    });

    links.push({
      channel: 'sms',
      label: 'SMS',
      icon: 'sms',
      url: buildSmsWishLink(birthday.phone, resolvedMessage),
      color: '#1976D2'
    });
  }

  if (birthday.telegramUsername) {
    links.push({
      channel: 'telegram',
      label: 'Telegram',
      icon: 'send',
      url: buildTelegramWishLink(birthday.telegramUsername, resolvedMessage),
      color: '#0088cc'
    });
  }

  return links;
}
