import { Component, Input, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { Birthday } from '../../models';

@Component({
    selector: 'app-message-indicator',
    imports: [CommonModule, MatTooltipModule, TranslatePipe],
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

  private readonly _tooltipData = computed(() => {
    const birthday = this._birthday();
    const messages = birthday?.scheduledMessages;
    if (!messages?.length) {
      return { key: birthday ? 'MESSAGE_INDICATOR.NO_MESSAGES' : 'MESSAGE_INDICATOR.NO_INFO', params: {} };
    }
    const active = messages.filter(msg => msg.active);
    if (active.length === 0) {
      const key = messages.length === 1 ? 'MESSAGE_INDICATOR.DISABLED_ONE' : 'MESSAGE_INDICATOR.DISABLED_MANY';
      return { key, params: { count: messages.length } };
    }
    if (active.length === 1 && messages.length === 1) {
      return { key: 'MESSAGE_INDICATOR.ONE_ACTIVE', params: { title: active[0].title, time: active[0].scheduledTime } };
    }
    if (active.length === messages.length) {
      return { key: 'MESSAGE_INDICATOR.ALL_ACTIVE', params: { count: active.length } };
    }
    return { key: 'MESSAGE_INDICATOR.SOME_ACTIVE', params: { active: active.length, total: messages.length } };
  });

  tooltipKey = computed(() => this._tooltipData().key);
  tooltipParams = computed(() => this._tooltipData().params);
}
