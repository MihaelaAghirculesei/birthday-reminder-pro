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
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
      text-decoration: none;
      z-index: 10000;

      &:focus {
        position: static;
        width: auto;
        height: auto;
        overflow: visible;
        clip: auto;
        white-space: normal;
        margin: 0;
        padding: 8px 16px;
        background: var(--primary-solid);
        color: white;
        border-radius: 0 0 4px 0;
        font-weight: 600;
        outline: 3px solid #ffd700;
        outline-offset: 2px;
      }
    }
  `]
})
export class SkipToContentComponent {}
