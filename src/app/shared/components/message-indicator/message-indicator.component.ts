import { Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Birthday } from '../../models';

@Component({
    selector: 'app-message-indicator',
    imports: [CommonModule, MatTooltipModule],
    templateUrl: './message-indicator.component.html',
    styleUrls: ['./message-indicator.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageIndicatorComponent implements OnChanges {
  @Input() birthday: Birthday | null = null;

  tooltipText = 'No information available';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['birthday']) {
      this.updateTooltipText();
    }
  }

  get hasActiveMessages(): boolean {
    if (!this.birthday?.scheduledMessages) {
      return false;
    }
    return this.birthday.scheduledMessages.some((msg) => msg.active);
  }

  get activeMessageCount(): number {
    if (!this.birthday?.scheduledMessages) return 0;
    return this.birthday.scheduledMessages.filter((msg) => msg.active).length;
  }

  get totalMessageCount(): number {
    return this.birthday?.scheduledMessages?.length || 0;
  }

  private updateTooltipText(): void {
    if (!this.birthday) {
      this.tooltipText = 'No information available';
      return;
    }

    const activeCount = this.activeMessageCount;
    const totalCount = this.totalMessageCount;

    if (activeCount === 0 && totalCount === 0) {
      this.tooltipText = '❌ No messages configured for this birthday';
      return;
    }

    if (activeCount === 0 && totalCount > 0) {
      this.tooltipText = `⏸️ ${totalCount} message${totalCount > 1 ? 's' : ''} configured but disabled`;
      return;
    }

    if (activeCount === 1 && totalCount === 1) {
      const message = this.birthday.scheduledMessages?.find(
        (msg) => msg.active
      );
      this.tooltipText = `✅ Message configured: "${message?.title}" - sending at ${message?.scheduledTime}`;
      return;
    }

    if (activeCount === totalCount) {
      this.tooltipText = `✅ ${activeCount} messages configured and active for birthday`;
      return;
    }

    this.tooltipText = `✅ ${activeCount} of ${totalCount} configured messages are active`;
  }

  getNextMessageInfo(): string {
    if (!this.hasActiveMessages) return '';

    const activeMessages =
      this.birthday?.scheduledMessages?.filter((msg) => msg.active) || [];

    if (activeMessages.length === 0) return '';

    const sortedMessages = activeMessages.sort((a, b) => {
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    const nextMessage = sortedMessages[0];
    return `Next: ${nextMessage.title} at ${nextMessage.scheduledTime}`;
  }
}
