import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Signal, ViewChild, ViewContainerRef, ComponentRef, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { trigger, style, transition, animate } from '@angular/animations';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PhotoUploadComponent } from '../../shared/components/photo-upload.component';
import { DEFAULT_CATEGORY, BirthdayCategory } from '../../shared/constants';
import { Birthday } from '../../shared/models';
import { getZodiacSign } from '../../shared/utils';
import { BirthdayFacadeService, CategoryFacadeService, LoggerService } from '../../core';

@Component({
    selector: 'app-home',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        PhotoUploadComponent,
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
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('dashboardContainer', { read: ViewContainerRef }) dashboardContainer?: ViewContainerRef;

  private readonly fb = inject(FormBuilder);
  private readonly birthdayFacade = inject(BirthdayFacadeService);
  private readonly categoryFacade = inject(CategoryFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly logger = inject(LoggerService);

  birthdayForm!: FormGroup;
  birthdays: Signal<Birthday[]> = this.birthdayFacade.birthdays;
  categories: Signal<BirthdayCategory[]> = this.categoryFacade.categories;
  selectedPhoto: string | null = null;
  isAddingTestData = false;
  isAddBirthdayExpanded = false;
  private testDataTimer: ReturnType<typeof setTimeout> | null = null;
  private dashboardComponentRef: ComponentRef<unknown> | null = null;
  private isDashboardLoaded = false;
  private viewReady = false;

  constructor() {
    this.birthdayForm = this.fb.group({
      name: ['', Validators.required],
      birthDate: ['', [Validators.required, this.pastDateValidator]],
      category: [DEFAULT_CATEGORY, Validators.required],
      notes: [''],
      reminderDays: [7, [Validators.min(1), Validators.max(365)]],
      photo: [null],
    });

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

  onSubmit() {
    if (this.birthdayForm.valid) {
      const birthDate = new Date(this.birthdayForm.value.birthDate);
      const zodiacSign = getZodiacSign(birthDate);

      const formData = {
        ...this.birthdayForm.value,
        photo: this.selectedPhoto,
        zodiacSign: zodiacSign.name,
      };

      this.birthdayFacade.addBirthday(formData);
      this.birthdayForm.reset({ reminderDays: 7, category: DEFAULT_CATEGORY });
      this.selectedPhoto = null;
    }
  }

  onPhotoSelected(photo: string): void {
    this.selectedPhoto = photo;
    this.birthdayForm.patchValue({ photo: photo });
  }

  onPhotoRemoved(): void {
    this.selectedPhoto = null;
    this.birthdayForm.patchValue({ photo: null });
  }

  addTestData(): void {
    this.isAddingTestData = true;
    this.birthdayFacade.loadTestData();
    this.testDataTimer = setTimeout(() => {
      this.isAddingTestData = false;
      this.testDataTimer = null;
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.testDataTimer) {
      clearTimeout(this.testDataTimer);
      this.testDataTimer = null;
    }
    this.unloadDashboard();
  }

  private async loadDashboard(): Promise<void> {
    if (!this.dashboardContainer || this.isDashboardLoaded) {
      return;
    }

    try {
      const { DashboardComponent } = await import('../dashboard');
      this.dashboardComponentRef = this.dashboardContainer.createComponent(DashboardComponent);
      this.isDashboardLoaded = true;
      this.cdr.markForCheck();
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

  toggleAddBirthdaySection(): void {
    this.isAddBirthdayExpanded = !this.isAddBirthdayExpanded;
  }

  trackByCategory(_index: number, category: BirthdayCategory): string {
    return category.id;
  }

  private pastDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      return { futureDate: true };
    }

    return null;
  }
}
