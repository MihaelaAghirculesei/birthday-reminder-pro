import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { toSignal } from '@angular/core/rxjs-interop';

import * as SyncSelectors from '../../../core/store/sync/sync.selectors';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="sync-status" [matTooltip]="tooltip()">
      @switch (syncSummary()?.state) {
        @case ('syncing') {
          <mat-spinner diameter="16" class="syncing"></mat-spinner>
          <span class="status-text">Syncing...</span>
        }
        @case ('error') {
          <mat-icon class="error">sync_problem</mat-icon>
          <span class="status-text error">Sync error</span>
        }
        @case ('offline') {
          <mat-icon class="offline">cloud_off</mat-icon>
          <span class="status-text offline">Offline</span>
        }
        @default {
          @if (syncSummary()?.pendingCount && syncSummary()!.pendingCount! > 0) {
            <mat-icon class="pending">cloud_upload</mat-icon>
            <span class="status-text pending">{{ syncSummary()?.pendingCount }} pending</span>
          } @else {
            <mat-icon class="synced">cloud_done</mat-icon>
            <span class="status-text synced">Synced</span>
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

    if (diff < 60000) return 'just now';
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString();
  }
}
