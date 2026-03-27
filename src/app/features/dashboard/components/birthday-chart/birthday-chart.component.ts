import { Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges, inject } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChartDataItem } from '../../services';

interface ChartDataItemView extends ChartDataItem {
  heightPercent: number;
  isCurrentMonth: boolean;
}

@Component({
    selector: 'app-birthday-chart',
    imports: [MatCardModule, MatIconModule, TranslatePipe],
    templateUrl: './birthday-chart.component.html',
    styleUrls: ['./birthday-chart.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BirthdayChartComponent implements OnChanges {
  private static nextId = 0;

  private readonly translate = inject(TranslateService);
  private readonly MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  @Input() chartData: ChartDataItem[] = [];
  @Input() maxCount = 0;
  @Input() currentMonth: number = new Date().getMonth();
  @Input() totalBirthdays = 0;

  /** Stable DOM id used by aria-describedby on the <figure>. */
  readonly chartDescId = `chart-desc-${++BirthdayChartComponent.nextId}`;

  chartDataItems: ChartDataItemView[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData'] || changes['maxCount'] || changes['currentMonth']) {
      this.chartDataItems = this.chartData.map(item => ({
        ...item,
        heightPercent: this.maxCount > 0 ? (item.count / this.maxCount) * 80 : 0,
        isCurrentMonth: this.MONTHS.indexOf(item.month) === this.currentMonth
      }));
    }
  }

  getChartAriaLabel(): string {
    return this.translate.instant('CHART.ARIA_TOTAL', { total: this.totalBirthdays });
  }
}
