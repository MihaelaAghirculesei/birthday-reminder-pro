import { ChangeDetectionStrategy,Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Store } from '@ngrx/store';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ONE_DAY_MS,ONE_HOUR_MS, ONE_MINUTE_MS } from '../../../core/constants/time.constants';
import * as SyncSelectors from '../../../core/store/sync/sync.selectors';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  template: `
    <div class="sync-status" [matTooltip]="tooltip()">
      @switch (syncSummary()?.state) {
        @case ('syncing') {
          <mat-spinner diameter="16" class="syncing"></mat-spinner>
          <span class="status-text">{{ 'SYNC_STATUS.SYNCING' | translate }}</span>
        }
        @case ('error') {
          <mat-icon class="error">sync_problem</mat-icon>
          <span class="status-text error">{{ 'SYNC_STATUS.SYNC_ERROR' | translate }}</span>
        }
        @case ('offline') {
          <mat-icon class="offline">cloud_off</mat-icon>
          <span class="status-text offline">{{ 'SYNC_STATUS.OFFLINE' | translate }}</span>
        }
        @default {
          @if (syncSummary()?.pendingCount && syncSummary()!.pendingCount! > 0) {
            <mat-icon class="pending">cloud_upload</mat-icon>
            <span class="status-text pending">{{ 'SYNC_STATUS.PENDING' | translate: {count: syncSummary()?.pendingCount} }}</span>
          } @else {
            <mat-icon class="synced">cloud_done</mat-icon>
            <span class="status-text synced">{{ 'SYNC_STATUS.SYNCED' | translate }}</span>
          }
        }
      }
    </div>
  `,
  styles: [`
    .sync-status {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 16px;
      background: var(--surface-variant, rgba(0, 0, 0, 0.05));
      font-size: 12px;
      cursor: default;
    }

    mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .syncing {
      color: var(--primary, #1976d2);
    }

    .synced {
      color: var(--success, #4caf50);
    }

    .error {
      color: var(--error, #f44336);
    }

    .offline {
      color: var(--warning, #ff9800);
    }

    .pending {
      color: var(--info, #2196f3);
    }

    .status-text {
      white-space: nowrap;
    }

    .status-text.synced {
      color: var(--success, #4caf50);
    }

    .status-text.error {
      color: var(--error, #f44336);
    }

    .status-text.offline {
      color: var(--warning, #ff9800);
    }

    .status-text.pending {
      color: var(--info, #2196f3);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncStatusComponent {
  private readonly store = inject(Store);
  private readonly translateService = inject(TranslateService);

  syncSummary = toSignal(
    this.store.select(SyncSelectors.selectSyncSummary),
    { initialValue: null }
  );

  tooltip = computed(() => {
    const summary = this.syncSummary();
    if (!summary) return '';

    const parts: string[] = [];

    if (summary.lastSync) {
      parts.push(`Last sync: ${this.formatTime(summary.lastSync)}`);
    }
    if (summary.pendingCount > 0) {
      parts.push(`${summary.pendingCount} changes pending upload`);
    }
    if (!summary.isOnline) {
      parts.push('Working offline - changes will sync when online');
    }
    if (summary.hasError) {
      parts.push('Sync encountered an error. Will retry automatically.');
    }

    return parts.join('\n') || 'All data synced';
  });

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < ONE_MINUTE_MS) return 'just now';
    if (diff < ONE_HOUR_MS) {
      const mins = Math.floor(diff / ONE_MINUTE_MS);
      return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    }
    if (diff < ONE_DAY_MS) {
      const hours = Math.floor(diff / ONE_HOUR_MS);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString();
  }
}
