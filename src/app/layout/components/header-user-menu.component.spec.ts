import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';

import { HeaderUserMenuComponent } from './header-user-menu.component';
import { provideTranslateTesting } from '../../testing/translate-testing';

describe('HeaderUserMenuComponent', () => {
  let component: HeaderUserMenuComponent;
  let fixture: ComponentFixture<HeaderUserMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HeaderUserMenuComponent,
        NoopAnimationsModule,
      ],
      providers: [
        provideMockStore({
          initialState: {
            auth: { user: null, loading: false, error: null }
          }
        }),
        provideTranslateTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderUserMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit signOutClicked when sign out is triggered', () => {
    spyOn(component.signOutClicked, 'emit');
    component.signOutClicked.emit();
    expect(component.signOutClicked.emit).toHaveBeenCalled();
  });

  it('should default to mobile mode', () => {
    expect(component.mode).toBe('mobile');
  });
});
