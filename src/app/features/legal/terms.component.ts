import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { TranslatePipe,TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-terms',
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
            <h1>Termini di Servizio</h1>
            <p class="last-updated">Ultimo aggiornamento: 10 giugno 2026</p>

            <section>
              <h2>1. Accettazione dei termini</h2>
              <p>Utilizzando Birthday Memories accetti i presenti Termini di Servizio. Se non li accetti, ti chiediamo di non utilizzare l'applicazione.</p>
            </section>

            <section>
              <h2>2. Descrizione del servizio</h2>
              <p>Birthday Memories è un'applicazione web gratuita e personale per gestire promemoria di compleanno, sincronizzare i dati tramite Google e inviare auguri ai propri contatti.</p>
            </section>

            <section>
              <h2>3. Account e responsabilità</h2>
              <p>Per accedere alle funzionalità cloud è necessario un account Google. Sei responsabile di mantenere riservate le credenziali del tuo account e di tutte le attività svolte con esso.</p>
            </section>

            <section>
              <h2>4. Uso consentito</h2>
              <p>L'app è fornita per uso personale. È vietato:</p>
              <ul>
                <li>Utilizzarla per attività commerciali o per conto terzi senza autorizzazione</li>
                <li>Caricare contenuti illeciti, offensivi o che violino diritti di terzi</li>
                <li>Tentare di compromettere la sicurezza o l'infrastruttura del servizio</li>
              </ul>
            </section>

            <section>
              <h2>5. Disponibilità del servizio</h2>
              <p>Il servizio viene fornito "così com'è" e "come disponibile". Non garantiamo la continuità del servizio né l'assenza di interruzioni. Ci riserviamo il diritto di modificare o interrompere il servizio in qualsiasi momento senza preavviso.</p>
            </section>

            <section>
              <h2>6. Limitazione di responsabilità</h2>
              <p>Nella misura massima consentita dalla legge applicabile, non siamo responsabili per danni indiretti, accidentali o consequenziali derivanti dall'uso o dall'impossibilità di usare il servizio.</p>
            </section>

            <section>
              <h2>7. Modifiche ai termini</h2>
              <p>Potremmo aggiornare questi termini periodicamente. La data di ultimo aggiornamento è indicata in cima a questa pagina. L'uso continuato del servizio dopo le modifiche costituisce accettazione dei nuovi termini.</p>
            </section>

            <section>
              <h2>8. Contatti</h2>
              <p>Per domande: <a href="mailto:aghirculesei@gmail.com">aghirculesei&#64;gmail.com</a></p>
            </section>
          </article>
        } @else {
          <article>
            <h1>Terms of Service</h1>
            <p class="last-updated">Last updated: June 10, 2026</p>

            <section>
              <h2>1. Acceptance</h2>
              <p>By using Birthday Memories you agree to these Terms of Service. If you do not agree, please do not use the application.</p>
            </section>

            <section>
              <h2>2. Description of the Service</h2>
              <p>Birthday Memories is a free, personal web application for managing birthday reminders, syncing data via Google, and sending wishes to your contacts.</p>
            </section>

            <section>
              <h2>3. Account &amp; Responsibility</h2>
              <p>A Google account is required to access cloud features. You are responsible for keeping your credentials confidential and for all activity under your account.</p>
            </section>

            <section>
              <h2>4. Permitted Use</h2>
              <p>The app is provided for personal use. You must not:</p>
              <ul>
                <li>Use it for commercial purposes or on behalf of third parties without authorisation</li>
                <li>Upload unlawful, offensive, or rights-infringing content</li>
                <li>Attempt to compromise the security or infrastructure of the service</li>
              </ul>
            </section>

            <section>
              <h2>5. Service Availability</h2>
              <p>The service is provided "as is" and "as available". We do not guarantee uninterrupted availability. We reserve the right to modify or discontinue the service at any time without notice.</p>
            </section>

            <section>
              <h2>6. Limitation of Liability</h2>
              <p>To the fullest extent permitted by applicable law, we are not liable for indirect, incidental, or consequential damages arising from the use or inability to use the service.</p>
            </section>

            <section>
              <h2>7. Changes to These Terms</h2>
              <p>We may update these terms periodically. The last-updated date at the top of this page reflects any changes. Continued use of the service after changes constitutes acceptance of the new terms.</p>
            </section>

            <section>
              <h2>8. Contact</h2>
              <p>Questions: <a href="mailto:aghirculesei@gmail.com">aghirculesei&#64;gmail.com</a></p>
            </section>
          </article>
        }

        <div class="legal-footer">
          <a mat-button routerLink="/privacy-policy">{{ 'FOOTER.PRIVACY_POLICY' | translate }}</a>
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
    }

    :host-context(body.dark-theme) article {
      background: var(--surface-elevated);
      box-shadow: none;
      border: 1px solid var(--border);
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
export class TermsComponent {
  private readonly translate = inject(TranslateService);

  readonly isIt = toSignal(
    this.translate.onLangChange.pipe(map(e => e.lang === 'it')),
    { initialValue: this.translate.currentLang === 'it' }
  );
}
