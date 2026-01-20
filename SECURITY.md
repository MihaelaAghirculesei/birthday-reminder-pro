# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by creating a private security advisory on GitHub or by emailing the maintainer directly. Please do not create public issues for security vulnerabilities.

---

## Security Best Practices

### 1. Environment Configuration

**Never commit sensitive credentials to version control.**

This project uses environment files that are excluded from Git:

```
src/environments/environment.ts          # ❌ NOT committed (in .gitignore)
src/environments/environment.prod.ts     # ❌ NOT committed (in .gitignore)
src/environments/environment.example.ts  # ✅ Committed (template only)
.env                                     # ❌ NOT committed (in .gitignore)
.env.example                             # ✅ Committed (template only)
```

**Setup Instructions:**
1. Copy `environment.example.ts` to `environment.ts`
2. Replace placeholder values with your actual credentials
3. Verify that `environment.ts` is listed in `.gitignore`
4. Never share your credentials in pull requests or issues

### 2. Google Calendar API Credentials

**Production vs Development Credentials:**
- Use **separate** OAuth 2.0 credentials for development and production
- Restrict API keys to specific APIs (Google Calendar API only)
- Add only authorized domains to JavaScript origins
- Enable OAuth consent screen for production use

**Credential Security:**
- Rotate API keys periodically
- Monitor usage in Google Cloud Console
- Set up billing alerts to detect unauthorized usage
- Revoke credentials immediately if compromised

### 3. Data Storage

**IndexedDB:**
- User data (birthdays) is stored locally in IndexedDB
- No sensitive data is transmitted to external servers (except Google Calendar sync)
- Clear browser data to remove all user information

**LocalStorage:**
- Used for app settings and preferences
- No sensitive authentication tokens stored
- Google Calendar tokens are managed by Google's JavaScript library

### 4. Third-Party Dependencies

**Dependency Management:**
- Regular `npm audit` checks for vulnerabilities
- Update dependencies promptly when security patches are available
- Review dependency licenses before adding new packages

**Latest Audit** (2025-12-20):
- **Status**: 42 vulnerabilities (4 low, 7 moderate, 31 high)
- **Action Taken**: Applied `npm audit fix` (9 packages updated)
- **Remaining**: Require Angular 19 migration (breaking changes)
- **Production Risk**: LOW (most are dev dependencies)

**Vulnerability Breakdown:**
| Component | Severity | Impact | Status |
|-----------|----------|--------|--------|
| @angular/common | High | XSRF token leakage | Mitigated by framework |
| webpack-dev-server | Moderate | Source code theft | Dev only (localhost) |
| imagemin plugins | Various | Build tools | No runtime impact |

**Risk Assessment:**
- ✅ Production runtime is secure
- ⚠️ Dev server: Use only on localhost
- ℹ️ Build tools: No runtime impact

**Current Security Measures:**
- Angular 17+ with built-in XSS protection
- Material Design components with accessibility features
- Service Workers for secure offline functionality

### 5. Content Security Policy (CSP)

**Implemented in `src/index.html`:**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://www.googleapis.com https://accounts.google.com;
  frame-src 'self' https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**Additional Security Headers:**
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

Server configuration examples available in `security-headers.conf`

### 6. HTTPS in Production

**Always deploy with HTTPS:**
- Google Calendar OAuth requires HTTPS in production
- Use SSL/TLS certificates (Let's Encrypt, Cloudflare, etc.)
- Enable HSTS (HTTP Strict Transport Security)
- Redirect HTTP to HTTPS

### 7. Input Validation & Sanitization

**Implemented Protections:**
- Angular's built-in sanitization prevents XSS attacks
- Form validation prevents invalid data entry
- TypeScript type checking at compile time
- Custom sanitization utilities in `src/app/shared/utils/sanitization.utils.ts`

**Sanitization Functions:**
- `sanitizeUserInput()` - Removes script tags, event handlers, dangerous HTML
- `sanitizeFileName()` - Validates file names, prevents directory traversal
- `sanitizeUrl()` - Validates URLs, allows only http/https/mailto protocols
- `sanitizePhoneNumber()` - Cleans phone number input
- `sanitizeEmail()` - Normalizes email addresses
- `escapeHtml()` - Escapes HTML special characters
- `validateBirthdayName()` - Validates birthday name input (max 100 chars)
- `validateBirthdayNotes()` - Validates notes (max 500 chars)
- `sanitizeBirthdayData()` - Complete birthday data sanitization

**Automated Security Checks:**
- CI/CD pipeline runs `npm audit` on every push
- Fails build on critical vulnerabilities
- Warns on 5+ high vulnerabilities
- Run manually: `npm audit --production`

---

## Deployment Checklist

Before deploying to production:

- [x] CSP headers configured in `src/index.html`
- [x] Security headers configured (see `security-headers.conf`)
- [x] Input sanitization utilities implemented
- [x] npm audit automation in CI/CD
- [ ] Separate OAuth credentials for production environment
- [ ] `environment.prod.ts` configured with production credentials
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Production domain added to Google OAuth authorized origins
- [ ] API keys restricted to production domain
- [ ] Server security headers applied (Apache/Nginx/Netlify/Vercel)
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Source maps disabled in production build
- [ ] Error tracking configured (but without exposing sensitive data)
- [ ] HSTS header enabled on server
- [ ] Rate limiting configured (if applicable)

---

## Incident Response

**If credentials are compromised:**

1. **Immediately** revoke compromised credentials in Google Cloud Console
2. Generate new credentials
3. Update environment files locally (do not commit)
4. Notify team members to update their local configurations
5. Review access logs for suspicious activity
6. If credentials were committed to Git:
   - Use `git-filter-repo` or BFG Repo-Cleaner to remove from history
   - Force push to remote (coordinate with team)
   - Invalidate all cloned repositories

**Emergency Contacts:**
- Project Maintainer: [Add contact information]
- Security Team: [Add contact information]

---

## Security Updates

This document is reviewed and updated regularly. Last review: 2026-01-11

**Recent Updates:**
- 2026-01-11: Implemented CSP headers, security headers, input sanitization utilities, npm audit automation in CI/CD
- 2025-12-20: Security audit completed, 9 packages updated, 42 vulnerabilities documented
- 2025-12-16: Initial security policy created

For questions about security practices, please open a discussion on GitHub.
