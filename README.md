# Birthday Reminder App

A birthday management application built with Angular 17. Never forget a birthday again with calendar sync, notifications, and offline support.

[![CI](https://github.com/MihaelaAghirculesei/birthday-reminder-app/actions/workflows/ci.yml/badge.svg)](https://github.com/MihaelaAghirculesei/birthday-reminder-app/actions/workflows/ci.yml)
[![Angular](https://img.shields.io/badge/Angular-17.3-red?logo=angular)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.4-blue?logo=capacitor)](https://capacitorjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Build & Deployment](#build--deployment)
- [Roadmap](#roadmap)
- [License](#license)

---

## About

I built this app to practice NgRx state management and learn how to build offline-first applications. It's a personal project where I wanted to explore cross-platform development with Capacitor.

The app manages birthdays with features like:
- Works offline using IndexedDB
- Syncs with Google Calendar (one-way or two-way)
- Sends notifications on web and Android
- Exports/imports data in multiple formats
- Organizes contacts by categories

---

## Features

**Birthday Management**
- Add, edit, delete birthdays with photos
- Categories for organizing (Family, Friends, Colleagues, etc.)
- Search and filter by name, category, or month
- Zodiac sign calculation
- Age tracking

**Notifications**
- Browser push notifications (using service workers)
- Native Android notifications (via Capacitor)
- Schedule custom messages with variables like `{name}`, `{age}`, `{zodiac}`
- Priority levels and message types (text/HTML)

**Google Calendar Integration**
- OAuth 2.0 authentication
- One-way or two-way sync
- Creates yearly recurring events
- Syncs updates and deletions
- Customizable reminders

**Data Management**
- Export: JSON, CSV
- Import: JSON, CSV, vCard
- Validates dates during import
- Backup and restore functionality

**Dashboard**
- Shows total birthdays and upcoming ones
- Average age calculation
- Next birthday countdown
- Monthly distribution chart
- Category statistics

**Offline Support**
- Works completely offline using IndexedDB
- Service worker caches assets
- Network status indicator
- Syncs when back online

**Other**
- Dark mode with automatic theme switching
- Undo last deletion
- Reassign categories in bulk
- Test data generator (40+ entries)
- Material Design UI
- Responsive design (still working on this)

---

## Tech Stack

**Frontend**
- Angular 17.3.12 (standalone components)
- TypeScript 5.4.2
- Angular Material 17.3.10
- RxJS 7.8.0

**State Management**
- NgRx 17.2.0 (Store, Effects, Entity adapters, Selectors)
- DevTools for debugging

**Mobile & PWA**
- Capacitor 7.4.4 for Android
- Angular Service Worker for offline caching
- @capacitor/local-notifications for native notifications

**Storage & APIs**
- IndexedDB (custom service)
- LocalStorage for settings
- Google Calendar API v3
- Google OAuth 2.0

**Development**
- Angular CLI 17.3.17
- Karma & Jasmine for testing

---

## Architecture

### State Management

I'm using NgRx for state management with the Redux pattern:

```
AppState
├── birthdays: BirthdayState (Entity State)
│   ├── entities: { [id: string]: Birthday }
│   ├── ids: string[]
│   ├── filters: { searchTerm, selectedMonth, selectedCategory, sortOrder }
│   └── ui: { loading, error, selectedBirthdayId }
├── categories: CategoryState (Entity State)
│   ├── entities: { [id: string]: BirthdayCategory }
│   └── ids: string[]
└── calendar: CalendarState
    └── settings: GoogleCalendarSettings
```

### Data Flow
Component → Action → Effect → Service (IndexedDB/API) → Effect → Reducer → Selector → Component

### Services

- Facade Services: `BirthdayFacadeService`, `CategoryFacadeService`
- `GoogleCalendarService` for Calendar API
- `PushNotificationService` for notifications
- `IndexedDBStorageService` for data persistence
- `BackupService` for import/export
- `NetworkService` for online/offline status

### Component Structure

```
src/app/
├── core/                    # Singleton services, state management
│   ├── store/              # NgRx store, actions, reducers, effects
│   └── services/           # Core business logic services
├── features/               # Feature modules
│   ├── dashboard/          # Main dashboard with stats and list
│   ├── calendar-sync/      # Google Calendar integration UI
│   └── scheduled-messages/ # Message scheduling feature
├── shared/                 # Shared components, models, utilities
│   ├── components/         # Reusable UI components
│   ├── models/             # TypeScript interfaces
│   ├── utils/              # Utility functions
│   └── icons/              # Custom SVG icon components
└── layout/                 # Header, footer components
```

---

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Angular CLI 17.x
- Android Studio (optional, for Android build)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MihaelaAghirculesei/birthday-reminder-app.git
   cd birthday-reminder-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Files**

   The app requires environment configuration for Google Calendar API integration:

   ```bash
   # Copy example files to create your local environment configs
   cp src/environments/environment.example.ts src/environments/environment.ts
   cp src/environments/environment.prod.example.ts src/environments/environment.prod.ts
   ```

   > ⚠️ **Security Note**: `environment.ts` and `environment.prod.ts` are in `.gitignore` and should NEVER be committed to version control.

4. **Configure Google Calendar API** (Optional)

   To enable Google Calendar synchronization:

   **a) Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (e.g., "Birthday Reminder App")
   - Enable the **Google Calendar API**

   **b) Create OAuth 2.0 Credentials:**
   - Navigate to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Add authorized JavaScript origins:
     - Development: `http://localhost:4200`
     - Production: `https://your-domain.com`
   - Click **Create**

   **c) Get API Key:**
   - Click **Create Credentials** > **API key**
   - Restrict the key to Google Calendar API (recommended)
   - Copy the API key

   **d) Update Environment Files:**

   Edit `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     googleCalendar: {
       clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // From step b
       apiKey: 'YOUR_API_KEY'  // From step c
     }
   };
   ```

   For production, update `src/environments/environment.prod.ts` with separate credentials.

   > 💡 **Tip**: Use different OAuth credentials for development and production environments.

### Development Server

Run the application in development mode:

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The app will reload automatically on file changes.

### Running Tests

Execute unit tests via Karma:

```bash
ng test
```

---

## Build & Deployment

### Web Build (PWA)

Build for production:

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

### Android Build

1. **Build the web app**
   ```bash
   ng build --configuration production
   ```

2. **Sync with Capacitor**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

4. **Build APK/AAB** in Android Studio

### Server-Side Rendering (SSR)

Build and run with SSR:

```bash
ng build
npm run serve:ssr:birthday-reminder-app
```

Note: SSR server runs on the built production files.

---

## Project Structure

```
birthday-reminder-app/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── birthday-facade.service.ts
│   │   │   │   ├── category-facade.service.ts
│   │   │   │   ├── google-calendar.service.ts
│   │   │   │   ├── push-notification.service.ts
│   │   │   │   ├── offline-storage.service.ts
│   │   │   │   ├── backup.service.ts
│   │   │   │   └── notification.service.ts
│   │   │   └── store/
│   │   │       ├── birthday/
│   │   │       │   ├── birthday.actions.ts
│   │   │       │   ├── birthday.reducer.ts
│   │   │       │   ├── birthday.effects.ts
│   │   │       │   ├── birthday.selectors.ts
│   │   │       │   └── birthday.state.ts
│   │   │       ├── category/
│   │   │       │   └── [similar structure]
│   │   │       └── app.state.ts
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   │   ├── components/
│   │   │   │   │   ├── dashboard.component.ts
│   │   │   │   │   ├── birthday-list/
│   │   │   │   │   ├── birthday-chart/
│   │   │   │   │   ├── stats/
│   │   │   │   │   └── category-filter/
│   │   │   │   └── services/
│   │   │   ├── calendar-sync/
│   │   │   │   └── google-calendar-sync.component.ts
│   │   │   └── scheduled-messages/
│   │   │       ├── scheduled-messages.component.ts
│   │   │       ├── message-schedule-dialog/
│   │   │       └── scheduled-message.service.ts
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── photo-upload.component.ts
│   │   │   │   ├── notification.component.ts
│   │   │   │   ├── zodiac-icon.component.ts
│   │   │   │   └── network-status.component.ts
│   │   │   ├── models/
│   │   │   │   └── birthday.model.ts
│   │   │   ├── utils/
│   │   │   │   └── date/
│   │   │   │       ├── zodiac.util.ts
│   │   │   │       └── age.util.ts
│   │   │   └── constants/
│   │   │       ├── categories.ts
│   │   │       └── months.constants.ts
│   │   ├── layout/
│   │   │   ├── header.component.ts
│   │   │   └── footer.component.ts
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── manifest.webmanifest
│   ├── ngsw-config.json
│   └── index.html
├── android/                 # Capacitor Android project
├── capacitor.config.ts
├── package.json
├── tsconfig.json
└── angular.json
```

---

## Roadmap

**Done**
- Core CRUD operations
- NgRx state management
- Google Calendar sync
- Push notifications (web + Android)
- Offline support with IndexedDB
- Import/export (JSON, CSV, vCard)
- Categories
- Dashboard with stats and charts
- Message scheduling
- Photo uploads
- PWA with service worker

**Working on**
- Responsive design
- Unit tests
- E2E tests

**Future ideas**
- i18n support
- iOS app
- Cloud backup
- Birthday wish templates
- Gift tracking

---

## Testing

Run tests with:
```bash
ng test
```

Coverage:
```bash
ng test --code-coverage
```

E2E tests are planned but not implemented yet.

---

## Contributing

This is a personal learning project, but suggestions are welcome! Feel free to open an issue or PR.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Mihaela Melania Aghirculesei**
- Portfolio: [mihaela-melania-aghirculesei.de](https://mihaela-melania-aghirculesei.de/)
- GitHub: [@MihaelaAghirculesei](https://github.com/MihaelaAghirculesei)
- LinkedIn: [mihaela-aghirculesei](https://www.linkedin.com/in/mihaela-aghirculesei/)

---

## Built With

- [Angular](https://angular.io/)
- [NgRx](https://ngrx.io/)
- [Angular Material](https://material.angular.io/)
- [Capacitor](https://capacitorjs.com/)
- [Google Calendar API](https://developers.google.com/calendar)

---

## Known Issues

- Responsive design needs work on mobile
- Some transitions could be smoother
- Google Calendar re-authentication after token expiry

### WebSocket errors during E2E tests
When running `npm run ci:local` you may see errors like:

```
Cannot establish a connection with the server ws://localhost:4203/
```

These errors are **normal and expected** - they occur because the dev server is terminated after the tests, but the browser keeps trying to maintain the WebSocket connection. The tests have still passed successfully.

---

**Note:** This is a learning project I built to practice NgRx and offline-first architecture. Feel free to check out the code!
