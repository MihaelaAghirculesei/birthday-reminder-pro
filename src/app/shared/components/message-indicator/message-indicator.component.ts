import { Component, Input, ChangeDetectionStrategy, signal, computed } from '@angular/core';
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
export class MessageIndicatorComponent {
  @Input() set birthday(value: Birthday | null) {
    this._birthday.set(value);
  }
  private _birthday = signal<Birthday | null>(null);

  hasActiveMessages = computed(() => {
    const active = this._birthday()?.scheduledMessages?.filter(msg => msg.active);
    return (active?.length ?? 0) > 0;
  });

  activeMessageCount = computed(() => {
    return this._birthday()?.scheduledMessages?.filter(msg => msg.active).length ?? 0;
  });

  tooltipText = computed(() => {
    const birthday = this._birthday();
    const messages = birthday?.scheduledMessages;
    if (!messages?.length) {
      return birthday ? '❌ No messages configured for this birthday' : 'No information available';
    }
    const active = messages.filter(msg => msg.active);
    if (active.length === 0) {
      return `⏸️ ${messages.length} message${messages.length > 1 ? 's' : ''} configured but disabled`;
    }
    if (active.length === 1 && messages.length === 1) {
      return `✅ Message configured: "${active[0].title}" - sending at ${active[0].scheduledTime}`;
    }
    if (active.length === messages.length) {
      return `✅ ${active.length} messages configured and active for birthday`;
    }
    return `✅ ${active.length} of ${messages.length} configured messages are active`;
  });
}
