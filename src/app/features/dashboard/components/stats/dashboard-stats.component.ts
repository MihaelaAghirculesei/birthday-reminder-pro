import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
@Component({
    selector: 'app-dashboard-stats',
    imports: [TranslatePipe, MatCardModule, MatIconModule],
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
