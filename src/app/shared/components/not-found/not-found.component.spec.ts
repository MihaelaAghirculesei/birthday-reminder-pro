import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslateTesting } from '../../../testing/translate-testing';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([]), provideTranslateTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a link back to the home page', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href="/"]');
    expect(link).not.toBeNull();
  });

  it('should render a heading', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading.textContent?.trim().length).toBeGreaterThan(0);
  });
});
