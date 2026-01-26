import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-remember-photo',
    imports: [MatTooltipModule],
    templateUrl: './remember-photo.component.html',
    styleUrls: ['./remember-photo.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RememberPhotoComponent {
  @Input() photoUrl: string | null | undefined = null;
  @Input() birthdayName = '';

  @Output() share = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() copyToClipboard = new EventEmitter<void>();

  readonly tooltipText = 'Remember Photo - Click: Download | Double-click: Share';

  onShare(): void {
    this.share.emit();
  }

  onDownload(): void {
    this.download.emit();
  }
}
