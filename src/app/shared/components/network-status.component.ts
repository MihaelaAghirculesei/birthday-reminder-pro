import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NetworkService } from '../../core';

@Component({
    selector: 'app-network-status',
    imports: [CommonModule, MatIconModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="network-status" [ngClass]="{'offline': (networkService.online$ | async) === false}">
      <mat-icon>{{ (networkService.online$ | async) ? 'wifi' : 'wifi_off' }}</mat-icon>
      <span>{{ (networkService.online$ | async) ? 'Online' : 'Offline' }}</span>
    </div>
  `,
    styles: [`
    .network-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: var(--radius);
      background: var(--success);
      color: var(--text-inverse);
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.offline {
        background: var(--warning);
        color: var(--text-inverse);
        box-shadow: 0 2px 8px rgba(252, 70, 107, 0.2);
        animation: pulse 2s infinite;

        mat-icon {
          animation: shake 0.8s ease-in-out infinite;
        }
      }
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }
  `]
})
export class NetworkStatusComponent {
  constructor(public networkService: NetworkService) {}
}