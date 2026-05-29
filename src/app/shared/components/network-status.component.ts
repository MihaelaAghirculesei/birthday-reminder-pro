import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NetworkService } from '../../core';

@Component({
    selector: 'app-network-status',
    imports: [NgClass, MatIconModule, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="network-status" [ngClass]="{'offline': !isOnline()}">
      <mat-icon>{{ isOnline() ? 'wifi' : 'wifi_off' }}</mat-icon>
      <span>{{ (isOnline() ? 'NETWORK.ONLINE' : 'NETWORK.OFFLINE') | translate }}</span>
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
      border: 1px solid rgba(0, 0, 0, 0.2);
      box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
      height: var(--header-icon-size, 36px);
      box-sizing: border-box;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      span {
        @media (max-width: 600px) {
          display: none;
        }
      }

      @media (max-width: 600px) {
        padding: 8px;
        position: relative;

        &:hover span {
          display: block;
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 6px;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 6px;
          font-size: 0.75rem;
          white-space: nowrap;
          z-index: 100;
          pointer-events: none;
        }
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
  private readonly networkService = inject(NetworkService);
  readonly isOnline = toSignal(this.networkService.online$, { initialValue: true });
}