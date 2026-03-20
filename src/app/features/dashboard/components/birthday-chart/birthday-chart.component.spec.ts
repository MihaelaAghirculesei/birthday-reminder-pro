import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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

  describe('ngOnChanges', () => {
    it('should enrich chart data when chartData changes', () => {
      component.chartData = mockChartData;
      component.maxCount = 3;
      component.currentMonth = 0; // January

      component.ngOnChanges({
        chartData: new SimpleChange([], mockChartData, true)
      });

      expect(component.enrichedChartData.length).toBe(4);
    });

    it('should re-enrich when maxCount changes', () => {
      component.chartData = mockChartData;
      component.maxCount = 5;
      component.ngOnChanges({
        maxCount: new SimpleChange(3, 5, false)
      });

      expect(component.enrichedChartData.length).toBe(4);
    });

    it('should re-enrich when currentMonth changes', () => {
      component.chartData = mockChartData;
      component.maxCount = 3;
      component.currentMonth = 2; // March
      component.ngOnChanges({
        currentMonth: new SimpleChange(0, 2, false)
      });

      const marchItem = component.enrichedChartData.find(i => i.month === 'Mar');
      expect(marchItem?.isCurrentMonth).toBeTrue();
    });

    it('should NOT re-enrich when unrelated input changes', () => {
      component.chartData = mockChartData;
      component.maxCount = 3;
      component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });
      const firstResult = component.enrichedChartData;

      component.ngOnChanges({ totalBirthdays: new SimpleChange(0, 5, false) });
      // Reference equality: same array means no re-computation
      expect(component.enrichedChartData).toBe(firstResult);
    });

    describe('heightPercent calculation', () => {
      it('should calculate heightPercent as percentage of maxCount when maxCount > 0', () => {
        component.chartData = mockChartData;
        component.maxCount = 3;
        component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });

        // Jan: count=3, maxCount=3 → (3/3)*80 = 80
        const janItem = component.enrichedChartData.find(i => i.month === 'Jan');
        expect(janItem?.heightPercent).toBeCloseTo(80);

        // Apr: count=2, maxCount=3 → (2/3)*80 ≈ 53.33
        const aprItem = component.enrichedChartData.find(i => i.month === 'Apr');
        expect(aprItem?.heightPercent).toBeCloseTo(53.33, 1);
      });

      it('should set heightPercent to 0 when maxCount is 0 (branch: maxCount > 0 false)', () => {
        component.chartData = mockChartData;
        component.maxCount = 0;
        component.ngOnChanges({ chartData: new SimpleChange([], mockChartData, true) });

        component.enrichedChartData.forEach(item => {
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

        const janItem = component.enrichedChartData.find(i => i.month === 'Jan');
        const febItem = component.enrichedChartData.find(i => i.month === 'Feb');
        expect(janItem?.isCurrentMonth).toBeTrue();
        expect(febItem?.isCurrentMonth).toBeFalse();
      });
    });
  });

  describe('trackByMonth', () => {
    it('should return the month string', () => {
      const item = { month: 'Jan', count: 3, label: 'January', heightPercent: 80, isCurrentMonth: true };
      expect(component.trackByMonth(0, item)).toBe('Jan');
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

  describe('getBarAriaLabel', () => {
    it('should use singular key when count is 1', () => {
      const label = component.getBarAriaLabel('February', 1);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('should use plural key when count is > 1', () => {
      const label = component.getBarAriaLabel('January', 3);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('should use plural key when count is 0', () => {
      const label = component.getBarAriaLabel('March', 0);
      expect(typeof label).toBe('string');
    });
  });
});
