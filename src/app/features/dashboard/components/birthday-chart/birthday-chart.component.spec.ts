import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateService } from '@ngx-translate/core';
import { BirthdayChartComponent } from './birthday-chart.component';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { ChartDataItem } from '../../services';

describe('BirthdayChartComponent', () => {
  let component: BirthdayChartComponent;
  let fixture: ComponentFixture<BirthdayChartComponent>;

  const mockChartData: ChartDataItem[] = [
    { month: 'Jan', count: 3, label: 'January' },
    { month: 'Feb', count: 1, label: 'February' },
    { month: 'Mar', count: 0, label: 'March' },
    { month: 'Apr', count: 2, label: 'April' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BirthdayChartComponent, NoopAnimationsModule],
      providers: [provideTranslateTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(BirthdayChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onLangChange', () => {
    it('should rebuild chart items when the language changes', () => {
      const translate = TestBed.inject(TranslateService);
      component.chartData = mockChartData;
      component.maxCount = 3;
      component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });

      translate.use('it');

      expect(component.chartDataItems.length).toBe(mockChartData.length);
    });
  });

  describe('ngOnChanges', () => {
    it('should enrich chart data when chartData changes', () => {
      component.chartData = mockChartData;
      component.maxCount = 3;
      component.currentMonth = 0; // January

      component.ngOnChanges({
        chartData: new SimpleChange([], mockChartData, true)
      });

      expect(component.chartDataItems.length).toBe(4);
    });

    it('should re-enrich when maxCount changes', () => {
      component.chartData = mockChartData;
      component.maxCount = 5;
      component.ngOnChanges({
        maxCount: new SimpleChange(3, 5, false)
      });

      expect(component.chartDataItems.length).toBe(4);
    });

    it('should re-enrich when currentMonth changes', () => {
      component.chartData = mockChartData;
      component.maxCount = 3;
      component.currentMonth = 2; // March
      component.ngOnChanges({
        currentMonth: new SimpleChange(0, 2, false)
      });

      const marchItem = component.chartDataItems.find(i => i.month === 'Mar');
      expect(marchItem?.isCurrentMonth).toBeTrue();
    });

    it('should NOT re-enrich when unrelated input changes', () => {
      component.chartData = mockChartData;
      component.maxCount = 3;
      component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });
      const firstResult = component.chartDataItems;

      component.ngOnChanges({ totalBirthdays: new SimpleChange(0, 5, false) });
      // Reference equality: same array means no re-computation
      expect(component.chartDataItems).toBe(firstResult);
    });

    describe('heightPercent calculation', () => {
      it('should calculate heightPercent as percentage of maxCount when maxCount > 0', () => {
        component.chartData = mockChartData;
        component.maxCount = 3;
        component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });

        // Jan: count=3, maxCount=3 → (3/3)*80 = 80
        const janItem = component.chartDataItems.find(i => i.month === 'Jan');
        expect(janItem?.heightPercent).toBeCloseTo(80);

        // Apr: count=2, maxCount=3 → (2/3)*80 ≈ 53.33
        const aprItem = component.chartDataItems.find(i => i.month === 'Apr');
        expect(aprItem?.heightPercent).toBeCloseTo(53.33, 1);
      });

      it('should set heightPercent to 0 when maxCount is 0 (branch: maxCount > 0 false)', () => {
        component.chartData = mockChartData;
        component.maxCount = 0;
        component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });

        component.chartDataItems.forEach(item => {
          expect(item.heightPercent).toBe(0);
        });
      });
    });

    describe('isCurrentMonth', () => {
      it('should mark Jan as current month when currentMonth is 0', () => {
        component.chartData = mockChartData;
        component.maxCount = 3;
        component.currentMonth = 0;
        component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });

        const janItem = component.chartDataItems.find(i => i.month === 'Jan');
        const febItem = component.chartDataItems.find(i => i.month === 'Feb');
        expect(janItem?.isCurrentMonth).toBeTrue();
        expect(febItem?.isCurrentMonth).toBeFalse();
      });
    });
  });

  describe('getChartAriaLabel', () => {
    it('should return translated aria label with total', () => {
      component.totalBirthdays = 6;
      const label = component.getChartAriaLabel();
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });

  describe('chartDescId', () => {
    it('should have a stable non-empty id', () => {
      expect(component.chartDescId).toBeTruthy();
      expect(typeof component.chartDescId).toBe('string');
    });

    it('should generate unique ids across instances', () => {
      const fixture2 = TestBed.createComponent(BirthdayChartComponent);
      expect(fixture2.componentInstance.chartDescId).not.toBe(component.chartDescId);
    });
  });

  describe('accessible DOM structure', () => {
    beforeEach(() => {
      component.chartData = mockChartData;
      component.maxCount = 3;
      component.totalBirthdays = 6;
      component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });
      fixture.detectChanges();
    });

    it('should render a <figure> with aria-label and aria-describedby', () => {
      const fig = fixture.nativeElement.querySelector('figure.chart-figure') as HTMLElement;
      expect(fig).toBeTruthy();
      expect(fig.getAttribute('aria-label')).toBeTruthy();
      expect(fig.getAttribute('aria-describedby')).toBe(component.chartDescId);
    });

    it('should render a sr-only <figcaption> whose id matches chartDescId', () => {
      const caption = fixture.nativeElement.querySelector(`figcaption#${component.chartDescId}`) as HTMLElement;
      expect(caption).toBeTruthy();
      expect(caption.classList).toContain('sr-only');
      expect(caption.textContent?.trim().length).toBeGreaterThan(0);
    });

    it('should render a sr-only <table> with aria-label, <caption>, thead and data rows', () => {
      const table = fixture.nativeElement.querySelector('table.sr-only') as HTMLTableElement;
      expect(table).toBeTruthy();
      expect(table.getAttribute('aria-label')).toBeTruthy();
      expect(table.querySelector('caption')).toBeTruthy();
      const headers = table.querySelectorAll('thead th');
      expect(headers.length).toBe(2);
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(mockChartData.length);
    });

    it('should render the visual .chart-container with aria-hidden="true"', () => {
      const container = fixture.nativeElement.querySelector('.chart-container') as HTMLElement;
      expect(container).toBeTruthy();
      expect(container.getAttribute('aria-hidden')).toBe('true');
    });

    it('visual bars should not carry aria roles or aria-labels', () => {
      const bars = fixture.nativeElement.querySelectorAll('.chart-bar') as NodeListOf<HTMLElement>;
      bars.forEach(bar => {
        expect(bar.getAttribute('role')).toBeNull();
        expect(bar.getAttribute('aria-label')).toBeNull();
      });
    });
  });
});
