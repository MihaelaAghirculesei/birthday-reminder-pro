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
  private readonly translate = inject(TranslateService);
  private readonly MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  @Input() chartData: ChartDataItem[] = [];
  @Input() maxCount = 0;
  @Input() currentMonth: number = new Date().getMonth();
  @Input() totalBirthdays = 0;

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

  trackByMonth(_index: number, monthData: ChartDataItemView): string {
    return monthData.month;
  }

  getChartAriaLabel(): string {
    return this.translate.instant('CHART.ARIA_TOTAL', { total: this.totalBirthdays });
  }

  getBarAriaLabel(month: string, count: number): string {
    const key = count === 1 ? 'CHART.BAR_ARIA_ONE' : 'CHART.BAR_ARIA_MANY';
    return this.translate.instant(key, { month, count });
  }
}
