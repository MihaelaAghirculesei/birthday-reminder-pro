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
  hasActiveMessages = false;
  activeMessageCount = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['birthday']) {
      this.computeState();
    }
  }

  private computeState(): void {
    const messages = this.birthday?.scheduledMessages;
    if (!messages?.length) {
      this.hasActiveMessages = false;
      this.activeMessageCount = 0;
      this.tooltipText = this.birthday
        ? '❌ No messages configured for this birthday'
        : 'No information available';
      return;
    }

    const active = messages.filter(msg => msg.active);
    this.activeMessageCount = active.length;
    this.hasActiveMessages = active.length > 0;

    if (active.length === 0) {
      this.tooltipText = `⏸️ ${messages.length} message${messages.length > 1 ? 's' : ''} configured but disabled`;
    } else if (active.length === 1 && messages.length === 1) {
      this.tooltipText = `✅ Message configured: "${active[0].title}" - sending at ${active[0].scheduledTime}`;
    } else if (active.length === messages.length) {
      this.tooltipText = `✅ ${active.length} messages configured and active for birthday`;
    } else {
      this.tooltipText = `✅ ${active.length} of ${messages.length} configured messages are active`;
    }
  }
}
