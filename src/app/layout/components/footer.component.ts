import { DOCUMENT,isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';


@Component({
    selector: 'app-footer',
    imports: [TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <footer class="app-footer">
      <button class="footer-logo-btn" (click)="scrollToTop()" aria-label="Scroll to top">
        <img src="assets/logo.png" alt="" class="footer-logo" width="100" height="100" loading="lazy" />
      </button>

      <div class="footer-center">
        <p class="footer-tagline">{{ 'FOOTER.TAGLINE' | translate }}</p>
        <p class="footer-copyright">&copy; {{ currentYear }} Mihaela Melania Aghirculesei</p>
      </div>

      <div class="footer-social">
        <a href="https://github.com/MihaelaAghirculesei" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </a>
        <a href="https://www.linkedin.com/in/mihaela-aghirculesei-84147a23b/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
      </div>
    </footer>
  `,
    styles: [`
    :host {
      display: block;
      position: relative;
      z-index: 1;
      background: rgba(75, 0, 130, 0.6);
    }

    :host-context(body.dark-theme) {
      background: var(--surface-elevated);
      border-top: 1px solid var(--border);
    }

    .app-footer {
      display: flex;
      align-items: center;
      position: relative;
      z-index: 1;
      max-width: var(--content-max-width);
      margin: 0 auto;
      padding: 0 32px;
    }

    .footer-logo-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease;

      &:hover {
        transform: scale(1.08) translateY(-4px);
        filter: drop-shadow(0 8px 16px rgba(255, 255, 255, 0.3));
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .footer-logo {
      height: 100px;
      width: auto;
      display: block;
    }

.footer-center {
      flex: 1;
      text-align: center;
    }

    .footer-tagline {
      color: rgba(255, 255, 255, 0.85);
      font-size: clamp(0.85rem, 1.2vw, 1.1rem);
      font-style: italic;
      margin: 0;
    }

    .footer-copyright {
      color: rgba(255, 255, 255, 0.6);
      font-size: clamp(0.75rem, 1vw, 0.95rem);
      margin: 0.25rem 0 0;
    }

    .footer-social {
      display: flex;
      gap: 0.75rem;
    }

    .footer-social a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.85);
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .footer-social a:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    .footer-social svg {
      width: 18px;
      height: 18px;
    }

    @media (max-width: 768px) {
      .app-footer {
        padding: 0 16px;
        margin: 0 auto;
      }

      .footer-logo {
        height: 60px;
      }

      .footer-logo-btn {
        &:hover {
          filter: drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3));
        }
      }

      .footer-tagline {
        font-size: 0.8rem;
      }

      .footer-copyright {
        font-size: 0.7rem;
      }

      .footer-social a {
        width: 32px;
        height: 32px;
      }

      .footer-social svg {
        width: 15px;
        height: 15px;
      }
    }
  `]
})
export class FooterComponent {
    private readonly document = inject(DOCUMENT);
    private readonly platformId = inject(PLATFORM_ID);
    currentYear = new Date().getFullYear();

    scrollToTop(): void {
      if (!isPlatformBrowser(this.platformId)) return;
      this.document.querySelector('.app-container')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
