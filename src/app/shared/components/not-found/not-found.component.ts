import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="not-found-container">
      <mat-icon class="not-found-icon" aria-hidden="true">search_off</mat-icon>
      <h1>{{ 'NOT_FOUND.TITLE' | translate }}</h1>
      <p>{{ 'NOT_FOUND.MESSAGE' | translate }}</p>
      <a mat-flat-button color="primary" routerLink="/">
        <mat-icon aria-hidden="true">arrow_back</mat-icon>
        {{ 'NOT_FOUND.BACK_HOME' | translate }}
      </a>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      min-height: 60vh;
      padding: 2rem 1rem;
      gap: 0.5rem;
      color: var(--text-primary);
    }

    .not-found-icon {
      width: 64px;
      height: 64px;
      font-size: 64px;
      opacity: 0.6;
      margin-bottom: 1rem;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.4rem, 4vw, 2rem);
    }

    p {
      margin: 0 0 1.5rem;
      opacity: 0.85;
      max-width: 32rem;
    }
  `]
})
export class NotFoundComponent {}
