import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LocaleDatePipe } from '../../../../../shared/pipes/locale-date.pipe';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ZodiacIconComponent, CategoryIconComponent, MessageIndicatorComponent, Birthday, calculateAge } from '../../../../../shared';
import { parseLocalDate } from '../../../../../shared/utils/date.utils';
import { RememberPhotoComponent } from '../../remember-photo/remember-photo.component';

@Component({
    selector: 'app-birthday-item',
    imports: [
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatMenuModule,
        MatDividerModule,
        ZodiacIconComponent,
        CategoryIconComponent,
        RememberPhotoComponent,
        MessageIndicatorComponent,
        TranslatePipe,
        LocaleDatePipe,
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
  age = 0;

  get birthDateDisplay(): Date {
    return parseLocalDate(this.birthday.birthDate);
  }

  @Output() edit = new EventEmitter<Birthday>();
  @Output() deleted = new EventEmitter<Birthday>();
  @Output() shareRememberPhoto = new EventEmitter<Birthday>();
  @Output() downloadRememberPhoto = new EventEmitter<Birthday>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['daysUntilBirthday']) {
      this.updateDaysData();
    }
    if (changes['birthday']) {
      this.age = calculateAge(this.birthday.birthDate);
    }
  }

  private updateDaysData(): void {
    const days = this.daysUntilBirthday;

    if (days === 0) {
      this.daysText = 'Today!';
      this.daysChipClass = 'red-alert';
    } else if (days === 1) {
      this.daysText = 'Tomorrow';
      this.daysChipClass = 'red-alert';
    } else if (days <= 7) {
      this.daysText = `${days} days`;
      this.daysChipClass = 'red-alert';
    } else if (days <= 21) {
      this.daysText = `${days} days`;
      this.daysChipClass = 'orange-warning';
    } else {
      this.daysText = `${days} days`;
      this.daysChipClass = 'green-safe';
    }
  }

  onEdit(event: Event): void {
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
