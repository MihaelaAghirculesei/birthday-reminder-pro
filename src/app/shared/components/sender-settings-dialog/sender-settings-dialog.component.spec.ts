import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SenderSettingsDialogComponent } from './sender-settings-dialog.component';
import { SenderSettingsService } from '../../../core';
import { provideTranslateTesting } from '../../../../testing/translate-testing';

describe('SenderSettingsDialogComponent', () => {
  let component: SenderSettingsDialogComponent;
  let fixture: ComponentFixture<SenderSettingsDialogComponent>;
  let senderSettings: jasmine.SpyObj<SenderSettingsService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SenderSettingsDialogComponent>>;

  beforeEach(async () => {
    senderSettings = jasmine.createSpyObj('SenderSettingsService', [
      'getSenderName', 'getSenderFullName', 'setSenderName', 'setSenderFullName'
    ]);
    senderSettings.getSenderName.and.returnValue('Mario');
    senderSettings.getSenderFullName.and.returnValue('Mario Rossi');

    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [SenderSettingsDialogComponent, NoopAnimationsModule],
      providers: [
        provideTranslateTesting(),
        { provide: SenderSettingsService, useValue: senderSettings },
        { provide: MatDialogRef, useValue: dialogRef },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SenderSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise fields from SenderSettingsService', () => {
    expect(component.senderName).toBe('Mario');
    expect(component.senderFullName).toBe('Mario Rossi');
  });

  it('save() should persist both fields and close with true', () => {
    component.senderName = 'Luigi';
    component.senderFullName = 'Luigi Verdi';

    component.save();

    expect(senderSettings.setSenderName).toHaveBeenCalledOnceWith('Luigi');
    expect(senderSettings.setSenderFullName).toHaveBeenCalledOnceWith('Luigi Verdi');
    expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
  });

  it('cancel button should close without a value', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('mat-dialog-actions button[mat-button]');
    btn.click();
    expect(dialogRef.close).toHaveBeenCalledOnceWith();
  });

  it('save button click should call save()', () => {
    spyOn(component, 'save');
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-raised-button]');
    btn.click();
    expect(component.save).toHaveBeenCalledTimes(1);
  });
});
