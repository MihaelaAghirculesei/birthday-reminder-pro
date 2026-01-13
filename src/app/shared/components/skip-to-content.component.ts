import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-skip-to-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#main-content" class="skip-link">
      Skip to main content
    </a>
  `,
  styles: [`
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #667eea;
      color: white;
      padding: 8px 16px;
      text-decoration: none;
      border-radius: 0 0 4px 0;
      font-weight: 600;
      z-index: 10000;
      transition: top 0.2s ease;

      &:focus {
        top: 0;
        outline: 3px solid #ffd700;
        outline-offset: 2px;
      }

      &:hover:focus {
        background: #5568d3;
      }
    }
  `]
})
export class SkipToContentComponent {}
