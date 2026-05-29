import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideTranslateTesting } from '../../../../testing/translate-testing';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;

  const baseData: ConfirmDialogData = { title: 'Delete?', message: 'This cannot be undone.' };

  function setup(data: ConfirmDialogData = baseData) {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        provideTranslateTesting(),
      ],
    });
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('rendering', () => {
    beforeEach(() => setup());

    it('should display title and message', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('h2')?.textContent).toContain('Delete?');
      expect(el.querySelector('p')?.textContent).toContain('This cannot be undone.');
    });

    it('should fall back to default button labels', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.cancel-btn')?.textContent).toContain('Cancel');
      expect(el.querySelector('.confirm-btn')?.textContent).toContain('Confirm');
    });

    it('should use default icons when none provided', () => {
      // header icon defaults to 'warning', confirm button icon defaults to 'check'
      const icons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-icon');
      expect(icons[0].textContent?.trim()).toBe('warning');
      expect(icons[1].textContent?.trim()).toBe('check');
    });
  });

  describe('rendering with custom data', () => {
    it('should display custom button labels and icon', () => {
      setup({ ...baseData, confirmText: 'Yes, delete', cancelText: 'Go back', icon: 'delete' });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.cancel-btn')?.textContent).toContain('Go back');
      expect(el.querySelector('.confirm-btn')?.textContent).toContain('Yes, delete');
      const icons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-icon');
      icons.forEach((icon) => expect(icon.textContent?.trim()).toBe('delete'));
    });

    it('should apply warn class when color is warn', () => {
      setup({ ...baseData, color: 'warn' });
      expect(fixture.nativeElement.querySelector('.confirm-btn.warn')).toBeTruthy();
    });

    it('should not apply warn class when color is not warn', () => {
      setup({ ...baseData, color: 'primary' });
      expect(fixture.nativeElement.querySelector('.confirm-btn.warn')).toBeNull();
    });
  });

  describe('actions', () => {
    beforeEach(() => setup());

    it('onCancel() closes dialog with false', () => {
      component.onCancel();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(false);
    });

    it('onConfirm() closes dialog with true', () => {
      component.onConfirm();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
    });

    it('cancel button click triggers onCancel()', () => {
      fixture.nativeElement.querySelector('.cancel-btn').click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(false);
    });

    it('confirm button click triggers onConfirm()', () => {
      fixture.nativeElement.querySelector('.confirm-btn').click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
    });
  });
});
