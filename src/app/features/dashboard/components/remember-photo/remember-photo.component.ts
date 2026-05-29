import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-remember-photo',
    imports: [MatTooltipModule],
    templateUrl: './remember-photo.component.html',
    styleUrls: ['./remember-photo.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RememberPhotoComponent {
  private readonly translate = inject(TranslateService);

  @Input() photoUrl: string | null | undefined = null;
  @Input() birthdayName = '';

  @Output() share = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() copyToClipboard = new EventEmitter<void>();

  get tooltipText(): string {
    return this.translate.instant('REMEMBER_PHOTO.TOOLTIP');
  }

  onShare(): void {
    this.share.emit();
  }

  onDownload(): void {
    this.download.emit();
  }
}
