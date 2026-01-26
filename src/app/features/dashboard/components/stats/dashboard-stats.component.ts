import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CalendarIconComponent } from '../../../../shared/icons/calendar-icon.component';

@Component({
    selector: 'app-dashboard-stats',
    imports: [MatCardModule, MatIconModule, CalendarIconComponent],
    templateUrl: './dashboard-stats.component.html',
    styleUrls: ['./dashboard-stats.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardStatsComponent {
  @Input() totalBirthdays = 0;
  @Input() birthdaysThisMonth = 0;
  @Input() averageAge = 0;
  @Input() nextBirthdayDays = 0;
  @Input() nextBirthdayText = '';
}
