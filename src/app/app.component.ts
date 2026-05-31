import { ChangeDetectionStrategy,Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent,HeaderComponent } from './layout';
import { NotificationComponent } from './shared/components/notification.component';
import { SkipToContentComponent } from './shared/components/skip-to-content.component';

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        NotificationComponent,
        SkipToContentComponent,
        HeaderComponent,
        FooterComponent,
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'Birthday Reminder App';
}