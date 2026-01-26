import { Component, ChangeDetectionStrategy } from '@angular/core';


@Component({
    selector: 'app-footer',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <footer class="app-footer">
      <div class="footer-content">
        <p>&copy; {{ currentYear }} Birthday Memories. All rights reserved.</p>
        <p class="footer-tagline">Made with ❤️ to never forget special moments</p>
      </div>
    </footer>
  `,
    styles: [`
    .app-footer {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      text-align: center;
      margin-top: 3rem;
      border-radius: 12px;
      box-shadow: 0 -4px 16px 0 rgba(31, 38, 135, 0.2);
    }

    .footer-content p {
      margin: 0.25rem 0;
      font-size: 0.9rem;
    }

    .footer-tagline {
      opacity: 0.9;
      font-size: 0.85rem;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .app-footer {
        padding: 1rem;
        margin-top: 2rem;
      }

      .footer-content p {
        font-size: 0.8rem;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
