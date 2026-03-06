import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-photo-upload',
    imports: [MatIconModule, MatButtonModule, MatTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="photo-upload-container">
      <div class="photo-preview"
        [class.has-photo]="currentPhoto"
        (click)="triggerFileInput()"
        (keydown.enter)="triggerFileInput()"
        (keydown.space)="triggerFileInput()"
        tabindex="0"
        role="button">
    
        @if (currentPhoto) {
          <div class="photo-display">
            <img [src]="currentPhoto" alt="Contact photo" class="contact-photo" width="120" height="120" loading="lazy" decoding="async">
            <div class="photo-overlay">
              <mat-icon>edit</mat-icon>
              <span>Change Photo</span>
            </div>
          </div>
        }
    
        @if (!currentPhoto) {
          <div class="photo-placeholder">
            <mat-icon class="upload-icon">add_a_photo</mat-icon>
            <span class="upload-text">Add Remember Photo</span>
            <small class="upload-hint">Click to upload image</small>
          </div>
        }
    
        <input
          #fileInput
          type="file"
          accept="image/*"
          (change)="onFileSelected($event)"
          style="display: none;">
        </div>
    
        @if (currentPhoto) {
          <button
            mat-icon-button
            color="warn"
            class="delete-button-circle"
            (click)="removePhoto($event)"
            matTooltip="Remove photo">
            <img src="assets/icons/delete-button.png" alt="Delete" class="delete-icon" width="24" height="24" loading="lazy" decoding="async">
          </button>
        }
      </div>
    `,
    styles: [`
    .photo-upload-container {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .photo-preview {
      width: 120px;
      height: 120px;
      border: 3px dashed var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      position: relative;
      background: var(--surface-elevated);

      &:hover {
        border-color: var(--primary);
        transform: scale(1.02);
        box-shadow: var(--shadow);
      }

      &.has-photo {
        border: 3px solid var(--primary);

        &:hover .photo-overlay {
          opacity: 1;
        }
      }
    }

    .photo-display {
      width: 100%;
      height: 100%;
      position: relative;

      .contact-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: calc(var(--radius) - 3px);
      }

      .photo-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        border-radius: calc(var(--radius) - 3px);
        color: white;

        mat-icon {
          font-size: 2rem;
          width: 2rem;
          height: 2rem;
          margin-bottom: 4px;
        }

        span {
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
        }
      }
    }

    .photo-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 16px;
      text-align: center;

      .upload-icon {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        color: var(--text-muted);
        margin-bottom: 8px;
        background: var(--primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .upload-text {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.9rem;
        margin-bottom: 2px;
        display: block;
        line-height: 1.1;
      }

      .upload-hint {
        color: var(--text-muted);
        font-size: 0.75rem;
        line-height: 1.1;
      }
    }

    .delete-button-circle {
      width: 40px !important;
      height: 40px !important;
      background: linear-gradient(135deg, var(--status-error-border) 0%, var(--error-color-hover) 100%) !important;
      color: white !important;
      border-radius: 50% !important;
      box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      border: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin-top: 8px !important;
      flex-shrink: 0;

      &:hover {
        transform: translateY(-1px) scale(1.1) !important;
        box-shadow: 0 6px 12px rgba(220, 53, 69, 0.4) !important;
      }

      .delete-icon {
        width: 18px !important;
        height: 18px !important;
        filter: brightness(0) invert(1);
        transition: all 0.3s ease;
        object-fit: contain;
      }

      &:hover .delete-icon {
        filter: brightness(0) invert(1) drop-shadow(0 0 4px rgba(255,255,255,0.8));
      }
    }

    @media (max-width: 768px) {
      .photo-upload-container {
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .photo-preview {
        width: 100px;
        height: 100px;
      }

      .photo-placeholder {
        padding: 12px;

        .upload-icon {
          font-size: 2rem;
          width: 2rem;
          height: 2rem;
          margin-bottom: 6px;
        }

        .upload-text {
          font-size: 0.75rem;
          margin-bottom: 2px;
        }

        .upload-hint {
          font-size: 0.65rem;
        }
      }
    }
  `]
})
export class PhotoUploadComponent {
  @Input() currentPhoto: string | null = null;
  @Output() photoSelected = new EventEmitter<string>();
  @Output() photoRemoved = new EventEmitter<void>();

  constructor(private notificationService: NotificationService) {}

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.show('File size must be less than 5MB', 'error');
        return;
      }

      if (!file.type.startsWith('image/')) {
        this.notificationService.show('Please select a valid image file', 'error');
        return;
      }

     const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        this.photoSelected.emit(base64String);
      };
      reader.onerror = () => {
        this.notificationService.show('Failed to read the selected file. Please try again.', 'error');
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(event: Event) {
    event.stopPropagation();
    this.photoRemoved.emit();
  }
}