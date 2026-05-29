import { Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChartDataItem } from '../../services';

const MONTH_SHORT_KEYS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTH_FULL_KEYS  = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

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
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() chartData: ChartDataItem[] = [];
  @Input() maxCount = 0;
  @Input() currentMonth: number = new Date().getMonth();
  @Input() totalBirthdays = 0;

  /** Stable DOM id used by aria-describedby on the <figure>. */
  readonly chartDescId = `chart-desc-${++BirthdayChartComponent.nextId}`;

  chartDataItems: ChartDataItemView[] = [];

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.rebuildItems();
        this.cdr.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData'] || changes['maxCount'] || changes['currentMonth']) {
      this.rebuildItems();
    }
  }

  private rebuildItems(): void {
    this.chartDataItems = this.chartData.map((item, idx) => ({
      ...item,
      month: this.translate.instant(`CHART.MONTHS_SHORT.${MONTH_SHORT_KEYS[idx]}`),
      label: this.translate.instant(`CHART.MONTHS_FULL.${MONTH_FULL_KEYS[idx]}`),
      heightPercent: this.maxCount > 0 ? (item.count / this.maxCount) * 80 : 0,
      isCurrentMonth: idx === this.currentMonth
    }));
  }

  getChartAriaLabel(): string {
    return this.translate.instant('CHART.ARIA_TOTAL', { total: this.totalBirthdays });
  }
}
