import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, DestroyRef, Signal, ViewChild, ViewContainerRef, ComponentRef, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, transition, animate } from '@angular/animations';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BirthdayFormComponent } from '../../shared/components/birthday-form/birthday-form.component';
import { BirthdayCategory } from '../../shared/constants';
import { Birthday } from '../../shared/models';
import { CategoryFacadeService, LoggerService } from '../../core';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { AppState } from '../../core/store/app.state';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';

@Component({
    selector: 'app-home',
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        BirthdayFormComponent,
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('expandCollapse', [
            transition(':enter', [
                style({ opacity: 0, height: '0px', overflow: 'hidden' }),
                animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, height: '*', overflow: 'hidden' })),
            ]),
            transition(':leave', [
                style({ opacity: 1, height: '*', overflow: 'hidden' }),
                animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, height: '0px', overflow: 'hidden' })),
            ]),
        ]),
    ]
})
export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('dashboardContainer', { read: ViewContainerRef }) dashboardContainer?: ViewContainerRef;

  private readonly store = inject(Store<AppState>);
  private readonly categoryFacade = inject(CategoryFacadeService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  birthdays: Signal<Birthday[]> = toSignal(this.store.select(BirthdaySelectors.selectAllBirthdays), { initialValue: [] });
  categories: Signal<BirthdayCategory[]> = this.categoryFacade.categories;
  isAddingTestData = signal(false);
  isAddBirthdayExpanded = false;
  private dashboardComponentRef: ComponentRef<unknown> | null = null;
  private isDashboardLoaded = false;
  private viewReady = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.unloadDashboard());

    effect(() => {
      const hasBirthdays = this.birthdays().length > 0;

      if (!this.viewReady) return;

      if (hasBirthdays && !this.isDashboardLoaded) {
        this.loadDashboard();
      } else if (!hasBirthdays && this.isDashboardLoaded) {
        this.unloadDashboard();
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.birthdays().length > 0 && !this.isDashboardLoaded) {
      this.loadDashboard();
    }
  }

  ngOnInit(): void {
    this.categoryFacade.loadCategories();
  }

  onBirthdaySubmitted(birthday: Omit<Birthday, 'id'>): void {
    this.store.dispatch(BirthdayActions.addBirthday({ birthday }));
    this.isAddBirthdayExpanded = false;
  }

  addTestData(): void {
    this.isAddingTestData.set(true);
    this.store.dispatch(BirthdayActions.loadTestData());
    timer(1000).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.isAddingTestData.set(false));
  }

  toggleAddBirthdaySection(): void {
    this.isAddBirthdayExpanded = !this.isAddBirthdayExpanded;
  }

  private async loadDashboard(): Promise<void> {
    if (!this.dashboardContainer || this.isDashboardLoaded) {
      return;
    }

    try {
      const { DashboardComponent } = await import('../dashboard');
      this.dashboardComponentRef = this.dashboardContainer.createComponent(DashboardComponent);
      this.isDashboardLoaded = true;
    } catch (error) {
      this.logger.error('Failed to load dashboard component:', error);
    }
  }

  private unloadDashboard(): void {
    if (this.dashboardComponentRef) {
      this.dashboardComponentRef.destroy();
      this.dashboardComponentRef = null;
    }
    if (this.dashboardContainer) {
      this.dashboardContainer.clear();
    }
    this.isDashboardLoaded = false;
  }
}
