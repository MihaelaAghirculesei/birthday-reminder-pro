export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
}

export function sanitizeUserInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function sanitizeUrl(url: string): string {
  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9+\-() ]/g, '').trim();
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function validateBirthdayName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 100) return false;
  const dangerousPatterns = /<script|<iframe|javascript:|on\w+=/i;
  return !dangerousPatterns.test(name);
}

export function validateBirthdayNotes(notes: string): boolean {
  if (!notes) return true;
  if (notes.length > 500) return false;
  const dangerousPatterns = /<script|<iframe|javascript:|on\w+=/i;
  return !dangerousPatterns.test(notes);
}

export function sanitizeBirthdayData(data: { name: string; notes?: string }): { name: string; notes?: string } {
  return {
    name: sanitizeUserInput(data.name),
    notes: data.notes ? sanitizeUserInput(data.notes) : undefined
  };
}
