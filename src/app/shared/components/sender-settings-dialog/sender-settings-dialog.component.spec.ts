import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import type { MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { SenderSettingsService } from '../../../core';
import { SenderSettingsDialogComponent } from './sender-settings-dialog.component';

describe('SenderSettingsDialogComponent', () => {
  let component: SenderSettingsDialogComponent;
  let fixture: ComponentFixture<SenderSettingsDialogComponent>;
  let senderSettings: MockedObject<SenderSettingsService>;
  let dialogRef: MockedObject<MatDialogRef<SenderSettingsDialogComponent>>;

  beforeEach(async () => {
    senderSettings = {
      getSenderName: vi.fn().mockName('SenderSettingsService.getSenderName'),
      getSenderFullName: vi.fn().mockName('SenderSettingsService.getSenderFullName'),
      setSenderName: vi.fn().mockName('SenderSettingsService.setSenderName'),
      setSenderFullName: vi.fn().mockName('SenderSettingsService.setSenderFullName')
    } as unknown as MockedObject<SenderSettingsService>;
    senderSettings.getSenderName.mockReturnValue('Mario');
    senderSettings.getSenderFullName.mockReturnValue('Mario Rossi');

    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as unknown as MockedObject<MatDialogRef<SenderSettingsDialogComponent>>;

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

    expect(senderSettings.setSenderName).toHaveBeenCalledTimes(1);

    expect(senderSettings.setSenderName).toHaveBeenCalledWith('Luigi');
    expect(senderSettings.setSenderFullName).toHaveBeenCalledTimes(1);
    expect(senderSettings.setSenderFullName).toHaveBeenCalledWith('Luigi Verdi');
    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('cancel button should close without a value', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('mat-dialog-actions button[mat-button]');
    btn.click();
    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('save button click should call save()', () => {
    vi.spyOn(component, 'save');
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-raised-button]');
    btn.click();
    expect(component.save).toHaveBeenCalledTimes(1);
  });
});
