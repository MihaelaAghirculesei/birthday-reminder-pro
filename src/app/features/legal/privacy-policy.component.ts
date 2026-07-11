import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { TranslatePipe,TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink, MatButtonModule, MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <a mat-button routerLink="/" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
          {{ 'NAV.DASHBOARD' | translate }}
        </a>

        @if (isIt()) {
          <article>
            <h1>Informativa sulla Privacy</h1>
            <p class="last-updated">Ultimo aggiornamento: 10 giugno 2026</p>

            <section>
              <h2>1. Titolare del trattamento</h2>
              <p>Mihaela Melania Aghirculesei — <a href="mailto:aghirculesei@gmail.com">aghirculesei&#64;gmail.com</a></p>
            </section>

            <section>
              <h2>2. Dati raccolti</h2>
              <p><strong>Dati dei compleanni</strong> — nome, data di nascita, note, categoria, foto (opzionale), informazioni di contatto (email, telefono, username Telegram — facoltativi, non condivisi con terze parti).</p>
              <p><strong>Dati di autenticazione</strong> — quando accedi con Google, otteniamo il tuo indirizzo email, nome visualizzato e foto profilo tramite Firebase Authentication (Google).</p>
              <p><strong>Segnalazione errori</strong> — i crash anonimi vengono inviati a Sentry. Non vengono trasmessi dati personali.</p>
              <p><strong>Cookie e storage locale</strong> — utilizziamo un cookie di sessione (<code>__Secure-fb_auth_hint</code>) strettamente necessario a ripristinare la tua sessione. Nessun cookie di profilazione o advertising.</p>
            </section>

            <section>
              <h2>3. Finalità del trattamento</h2>
              <ul>
                <li>Visualizzare e gestire i promemoria di compleanno</li>
                <li>Sincronizzare i dati tra i tuoi dispositivi (solo se effettui l'accesso)</li>
                <li>Inviare auguri attraverso i canali di contatto da te configurati</li>
                <li>Diagnostica tecnica anonima tramite Sentry</li>
              </ul>
              <p>Non vendiamo, noleggiamo né condividiamo i tuoi dati con terze parti per fini pubblicitari.</p>
            </section>

            <section>
              <h2>4. Dove vengono conservati i dati</h2>
              <p><strong>Localmente</strong> — IndexedDB nel tuo browser (rimane sul tuo dispositivo).</p>
              <p><strong>Cloud</strong> — Firebase Firestore e Firebase Storage (Google LLC, USA) — solo se effettui l'accesso. I trasferimenti verso gli USA avvengono tramite le Standard Contractual Clauses di Google.</p>
            </section>

            <section>
              <h2>5. I tuoi diritti (GDPR)</h2>
              <ul>
                <li><strong>Accesso</strong> — esporta i tuoi dati in JSON dalla dashboard (icona Import/Export).</li>
                <li><strong>Rettifica</strong> — modifica qualsiasi compleanno direttamente nell'app.</li>
                <li><strong>Cancellazione</strong> — usa il pulsante "Elimina account" nel menu utente per rimuovere definitivamente tutti i tuoi dati.</li>
                <li><strong>Portabilità</strong> — il file JSON esportato è in formato standard leggibile da qualsiasi editor di testo.</li>
              </ul>
              <p>Per esercitare altri diritti scrivi a <a href="mailto:aghirculesei@gmail.com">aghirculesei&#64;gmail.com</a>.</p>
            </section>

            <section>
              <h2>6. Conservazione dei dati</h2>
              <p>I dati cloud vengono conservati finché hai un account attivo. Dopo l'eliminazione dell'account vengono rimossi entro 30 giorni dai backup di Google.</p>
            </section>

            <section>
              <h2>7. Contatti</h2>
              <p>Per qualsiasi domanda relativa alla privacy: <a href="mailto:aghirculesei@gmail.com">aghirculesei&#64;gmail.com</a></p>
            </section>
          </article>
        } @else {
          <article>
            <h1>Privacy Policy</h1>
            <p class="last-updated">Last updated: June 10, 2026</p>

            <section>
              <h2>1. Data Controller</h2>
              <p>Mihaela Melania Aghirculesei — <a href="mailto:aghirculesei@gmail.com">aghirculesei&#64;gmail.com</a></p>
            </section>

            <section>
              <h2>2. Data We Collect</h2>
              <p><strong>Birthday data</strong> — names, birth dates, notes, categories, photos (optional), contact info (email, phone, Telegram username — optional, never shared with third parties).</p>
              <p><strong>Authentication data</strong> — when you sign in with Google, we receive your email address, display name, and profile picture via Firebase Authentication (Google).</p>
              <p><strong>Error reporting</strong> — anonymous crash reports are sent to Sentry. No personal data is transmitted.</p>
              <p><strong>Cookies &amp; local storage</strong> — we use one strictly necessary session cookie (<code>__Secure-fb_auth_hint</code>) to restore your session. No tracking or advertising cookies.</p>
            </section>

            <section>
              <h2>3. How We Use Your Data</h2>
              <ul>
                <li>To display and manage your birthday reminders</li>
                <li>To sync your data across devices (only when signed in)</li>
                <li>To send birthday wishes through contact channels you configured</li>
                <li>Anonymous technical diagnostics via Sentry</li>
              </ul>
              <p>We do not sell, rent, or share your data with any third party for advertising purposes.</p>
            </section>

            <section>
              <h2>4. Where Data Is Stored</h2>
              <p><strong>Locally</strong> — IndexedDB in your browser (stays on your device).</p>
              <p><strong>Cloud</strong> — Firebase Firestore and Firebase Storage (Google LLC, USA) — only when signed in. Transfers to the US are covered by Google's Standard Contractual Clauses.</p>
            </section>

            <section>
              <h2>5. Your Rights (GDPR)</h2>
              <ul>
                <li><strong>Access</strong> — export your data as JSON from the dashboard (Import/Export icon).</li>
                <li><strong>Rectification</strong> — edit any birthday directly in the app.</li>
                <li><strong>Erasure</strong> — use the "Delete account" button in the user menu to permanently remove all your data.</li>
                <li><strong>Portability</strong> — the exported JSON file is a standard format readable in any text editor.</li>
              </ul>
              <p>To exercise other rights, contact <a href="mailto:aghirculesei@gmail.com">aghirculesei&#64;gmail.com</a>.</p>
            </section>

            <section>
              <h2>6. Data Retention</h2>
              <p>Cloud data is retained while your account is active. After account deletion, data is removed from Google backups within 30 days.</p>
            </section>

            <section>
              <h2>7. Contact</h2>
              <p>Privacy questions: <a href="mailto:aghirculesei@gmail.com">aghirculesei&#64;gmail.com</a></p>
            </section>
          </article>
        }

        <div class="legal-footer">
          <a mat-button routerLink="/terms">{{ 'FOOTER.TERMS' | translate }}</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      padding: 24px 16px 48px;
      background: var(--background, #fafafa);
    }

    .legal-container {
      max-width: 720px;
      margin: 0 auto;
    }

    .back-btn {
      margin-bottom: 16px;
      color: var(--text-secondary, rgba(0, 0, 0, 0.6));
    }

    article {
      background: var(--surface, #fff);
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 500;
      margin: 0 0 4px;
      color: var(--text-primary, rgba(0, 0, 0, 0.87));
    }

    .last-updated {
      font-size: 0.85rem;
      color: var(--text-secondary, rgba(0, 0, 0, 0.6));
      margin: 0 0 32px;
    }

    h2 {
      font-size: 1.05rem;
      font-weight: 500;
      margin: 24px 0 8px;
      color: var(--text-primary, rgba(0, 0, 0, 0.87));
    }

    p, li {
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--text-secondary, rgba(0, 0, 0, 0.7));
      margin: 0 0 8px;
    }

    ul {
      padding-left: 20px;
      margin: 0 0 8px;
    }

    a {
      color: #1976d2;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    code {
      font-family: monospace;
      font-size: 0.85em;
      background: rgba(0, 0, 0, 0.06);
      padding: 1px 5px;
      border-radius: 3px;
    }

    section {
      border-top: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      padding-top: 4px;
    }

    section:first-of-type {
      border-top: none;
    }

    .legal-footer {
      display: flex;
      justify-content: center;
      margin-top: 24px;
      gap: 8px;
    }

    :host-context(body.dark-theme) article {
      background: var(--surface-elevated);
      box-shadow: none;
      border: 1px solid var(--border);
    }

    :host-context(body.dark-theme) code {
      background: rgba(255, 255, 255, 0.1);
    }

    @media (max-width: 600px) {
      article {
        padding: 20px;
      }

      h1 {
        font-size: 1.4rem;
      }
    }
  `]
})
export class PrivacyPolicyComponent {
  private readonly translate = inject(TranslateService);

  readonly isIt = toSignal(
    this.translate.onLangChange.pipe(map(e => e.lang === 'it')),
    { initialValue: this.translate.currentLang === 'it' }
  );
}
