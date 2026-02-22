import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ZodiacIconComponent, CategoryIconComponent, MessageIndicatorComponent, Birthday, calculateAge } from '../../../../../shared';
import { RememberPhotoComponent } from '../../remember-photo/remember-photo.component';

@Component({
    selector: 'app-birthday-item',
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatMenuModule,
        MatDividerModule,
        ZodiacIconComponent,
        CategoryIconComponent,
        RememberPhotoComponent,
        MessageIndicatorComponent,
    ],
    templateUrl: './birthday-item.component.html',
    styleUrls: ['./birthday-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BirthdayItemComponent implements OnChanges {
  @Input() birthday!: Birthday;
  @Input() daysUntilBirthday = 0;
  @Input() defaultCategory = '';

  daysText = '';
  daysChipClass = 'green-safe';

  @Output() edit = new EventEmitter<Birthday>();
  @Output() deleted = new EventEmitter<Birthday>();
  @Output() shareRememberPhoto = new EventEmitter<Birthday>();
  @Output() downloadRememberPhoto = new EventEmitter<Birthday>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['daysUntilBirthday']) {
      this.updateDaysData();
    }
  }

  private updateDaysData(): void {
    const days = this.daysUntilBirthday;

    if (days === 0) {
      this.daysText = 'Today!';
    } else if (days === 1) {
      this.daysText = 'Tomorrow';
    } else {
      this.daysText = `${days} days`;
    }

    if (days <= 7) {
      this.daysChipClass = 'red-alert';
    } else if (days <= 21) {
      this.daysChipClass = 'orange-warning';
    } else {
      this.daysChipClass = 'green-safe';
    }
  }

  getAge(birthDate: Date): number {
    return calculateAge(birthDate);
  }

  onEdit(event: Event): void {
    // Release focus from button to prevent aria-hidden warning
    (event.currentTarget as HTMLElement).blur();
    this.edit.emit(this.birthday);
  }

  onDelete(): void {
    this.deleted.emit(this.birthday);
  }

  onShareRememberPhoto(): void {
    this.shareRememberPhoto.emit(this.birthday);
  }

  onDownloadRememberPhoto(): void {
    this.downloadRememberPhoto.emit(this.birthday);
  }
}
