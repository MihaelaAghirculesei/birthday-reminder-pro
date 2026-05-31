import { ChangeDetectionStrategy,Component, Input } from '@angular/core';

@Component({
  selector: 'app-calendar-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="calendar-icon"
      [class]="cssClass">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M4 11h16" />
      <path d="M8 14v4" />
      <path d="M12 14v4" />
      <path d="M16 14v4" />
    </svg>
  `,
  styles: [`
    .calendar-icon {
      display: inline-block;
      vertical-align: middle;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .calendar-icon:hover {
      transform: scale(1.1);
    }

    .hero-icon {
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }

    .small-icon {
      opacity: 0.8;
    }

    .primary-icon {
      color: var(--primary);
    }

    .stat-icon {
      border-radius: 50%;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 80px;
      min-height: 80px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .stat-icon.month {
      background: linear-gradient(135deg, var(--secondary));
      color: var(--text-inverse);
      box-shadow: 0 8px 16px rgba(240, 147, 251, 0.3);
    }
  `]
})
export class CalendarIconComponent {
  @Input() size = '24';
  @Input() strokeWidth = '2';
  @Input() cssClass = '';
}